// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// WGEA Employer Gender Pay Gaps — data pipeline
// Downloads the official WGEA employer gender pay gaps spreadsheet, parses it
// with SheetJS, and emits compact JSON for the frontend to load.
//
// Output: ../public/data/{employers.json, groups.json, meta.json}
//
// Run: cd pipeline && npm ci && node collect.mjs

import * as XLSX from 'xlsx';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'data');
const LOCAL_XLSX = join(__dirname, 'source.xlsx'); // optional cached copy

const SOURCE_URL =
  'https://www.wgea.gov.au/sites/default/files/documents/Employer-Gender-Pay-Gaps-Spreadsheet.xlsx';

const REPORTING_YEAR = '2024-25';
const PRIOR_YEAR = '2023-24';

const EMPLOYERS_SHEET = '2. Employers ';
const GROUPS_SHEET = '3. Corporate groups ';

const SECTORS = ['Private', 'Public'];
// Order matters (smallest -> largest) for the size filter UI.
const SIZES = ['<250', '250-499', '500-999', '1000-4999', '5000+'];

const log = (msg) => process.stdout.write(`[collect] ${msg}\n`);

async function getWorkbook() {
  if (existsSync(LOCAL_XLSX)) {
    log(`Using cached spreadsheet at ${LOCAL_XLSX}`);
    return XLSX.read(readFileSync(LOCAL_XLSX), { type: 'buffer' });
  }
  log(`Downloading ${SOURCE_URL}`);
  const res = await fetch(SOURCE_URL, {
    headers: { 'User-Agent': 'au-pay-gap-pipeline/1.0 (+https://au-pay-gap.benrichardson.dev)' },
  });
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  log(`Downloaded ${(buf.length / 1e6).toFixed(1)} MB`);
  return XLSX.read(buf, { type: 'buffer' });
}

// Convert an Excel cell to a rounded number, or null when blank / non-numeric.
function num(v, dp) {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.\-]/g, ''));
  if (!Number.isFinite(n)) return null;
  if (dp === undefined) return n;
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

const sectorIndex = (v) => Math.max(0, SECTORS.indexOf(String(v || '').trim()));
const sizeIndex = (v) => Math.max(0, SIZES.indexOf(String(v || '').replace(/\s+/g, '').trim()));

function rowsFrom(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Missing sheet: ${sheetName}`);
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: null });
}

// First pass: raw employer records keeping division/class as strings.
function rawEmployers(wb) {
  const rows = rowsFrom(wb, EMPLOYERS_SHEET);
  const out = [];
  for (let i = 4; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0]) continue;
    const name = String(r[0]).trim();
    if (!name || name.toLowerCase().startsWith('employer name')) continue;
    out.push({
      n: name,
      abn: String(r[1] || '').replace(/\s+/g, ''),
      sec: sectorIndex(r[2]),
      _div: String(r[3] || '').trim(),
      _cls: String(r[4] || '').trim(),
      sz: sizeIndex(r[5]),
      at: num(r[6], 4), ab: num(r[7], 4), mt: num(r[8], 4), mb: num(r[9], 4),
      pat: num(r[10], 4), pab: num(r[11], 4), pmt: num(r[12], 4), pmb: num(r[13], 4),
      w: [num(r[14], 3), num(r[15], 3), num(r[16], 3), num(r[17], 3), num(r[18], 3)],
      r: [num(r[19]), num(r[20]), num(r[21]), num(r[22]), num(r[23])],
    });
  }
  return out;
}

function parseGroups(wb) {
  const rows = rowsFrom(wb, GROUPS_SHEET);
  const out = [];
  for (let i = 4; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0]) continue;
    const name = String(r[0]).trim();
    if (!name || name.toLowerCase().startsWith('corporate group')) continue;
    out.push({
      n: name,
      sec: sectorIndex(r[1]),
      sz: sizeIndex(r[2]),
      at: num(r[3], 4), ab: num(r[4], 4), mt: num(r[5], 4), mb: num(r[6], 4),
      pat: num(r[7], 4), pab: num(r[8], 4), pmt: num(r[9], 4), pmb: num(r[10], 4),
      w: [num(r[11], 3), num(r[12], 3), num(r[13], 3), num(r[14], 3), num(r[15], 3)],
      r: [num(r[16]), num(r[17]), num(r[18]), num(r[19]), num(r[20])],
    });
  }
  return out;
}

function median(nums) {
  const a = nums.filter((n) => n !== null && n !== undefined).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

function buildMeta(employers, divisions, classes) {
  const mt = employers.map((e) => e.mt).filter((v) => v !== null);
  const favMen = mt.filter((v) => v > 0.05).length;
  const favWomen = mt.filter((v) => v < -0.05).length;
  const inTarget = mt.filter((v) => v >= -0.05 && v <= 0.05).length;

  const byDiv = divisions.map((name, idx) => {
    const es = employers.filter((e) => e.div === idx);
    return {
      name,
      count: es.length,
      medianMt: median(es.map((e) => e.mt)),
      medianAt: median(es.map((e) => e.at)),
      medianWomen: median(es.map((e) => e.w[0])),
      medianUpperWomen: median(es.map((e) => e.w[1])),
    };
  });

  return {
    reportingYear: REPORTING_YEAR,
    priorYear: PRIOR_YEAR,
    source: 'Workplace Gender Equality Agency (WGEA)',
    sourceUrl: 'https://www.wgea.gov.au/Data-Explorer',
    generatedAt: new Date().toISOString(),
    sectors: SECTORS,
    sizes: SIZES,
    divisions,
    classes,
    counts: {
      employers: employers.length,
      favourMen: favMen,
      favourWomen: favWomen,
      inTargetZone: inTarget,
    },
    national: {
      medianMedianTotalGpg: median(mt),
      medianAvgTotalGpg: median(employers.map((e) => e.at)),
      medianWomenTotal: median(employers.map((e) => e.w[0])),
      medianWomenUpper: median(employers.map((e) => e.w[1])),
      medianWomenLower: median(employers.map((e) => e.w[4])),
    },
    industries: byDiv,
  };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const wb = await getWorkbook();

  const raw = rawEmployers(wb);
  const divisions = [...new Set(raw.map((e) => e._div).filter(Boolean))].sort();
  const classes = [...new Set(raw.map((e) => e._cls).filter(Boolean))].sort();
  const divIdx = new Map(divisions.map((d, i) => [d, i]));
  const clsIdx = new Map(classes.map((c, i) => [c, i]));

  const employers = raw.map((e) => {
    const { _div, _cls, ...rest } = e;
    return { ...rest, div: divIdx.has(_div) ? divIdx.get(_div) : -1, cls: clsIdx.has(_cls) ? clsIdx.get(_cls) : -1 };
  });

  const groups = parseGroups(wb);
  const meta = buildMeta(employers, divisions, classes);

  writeFileSync(join(OUT_DIR, 'employers.json'), JSON.stringify(employers));
  writeFileSync(join(OUT_DIR, 'groups.json'), JSON.stringify(groups));
  writeFileSync(join(OUT_DIR, 'meta.json'), JSON.stringify(meta));

  log(`Wrote ${employers.length} employers, ${groups.length} groups, ${divisions.length} divisions.`);
  log(`National median (median total-rem GPG): ${(meta.national.medianMedianTotalGpg * 100).toFixed(1)}%`);
}

main().catch((err) => {
  process.stderr.write(`[collect] ERROR: ${err.stack || err}\n`);
  process.exit(1);
});
