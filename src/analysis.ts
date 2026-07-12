// Pure data-analysis functions: statistics, filtering, sorting, aggregation,
// anomaly/insight detection. No DOM — all unit tested.

import type { Employer, Entity, Meta, MetricKey, PriorKey } from './types.ts';
import { METRICS } from './types.ts';
import { direction, TARGET_BAND } from './gpg.ts';

export function median(nums: (number | null | undefined)[]): number | null {
  const a = nums.filter((n): n is number => n !== null && n !== undefined && Number.isFinite(n)).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

export function mean(nums: (number | null | undefined)[]): number | null {
  const a = nums.filter((n): n is number => n !== null && n !== undefined && Number.isFinite(n));
  if (!a.length) return null;
  return a.reduce((s, n) => s + n, 0) / a.length;
}

export const priorKeyFor = (m: MetricKey): PriorKey =>
  (METRICS.find((x) => x.key === m)?.prior ?? 'pmt') as PriorKey;

export interface Filters {
  search: string;
  sectors: Set<number>; // empty = all
  sizes: Set<number>; // empty = all
  divisions: Set<number>; // empty = all
  direction: 'all' | 'men' | 'women' | 'target';
}

export function emptyFilters(): Filters {
  return { search: '', sectors: new Set(), sizes: new Set(), divisions: new Set(), direction: 'all' };
}

// The UI's "target" filter maps to gpg's "equal" (inside the ±5% band).
function matchesDirection(want: Filters['direction'], v: number | null): boolean {
  if (want === 'all') return true;
  const d = direction(v);
  if (want === 'target') return d === 'equal';
  return d === want;
}

export function filterEmployers(list: Employer[], f: Filters, metric: MetricKey): Employer[] {
  const q = f.search.trim().toLowerCase();
  return list.filter((e) => {
    if (q && !e.n.toLowerCase().includes(q) && !e.abn.includes(q)) return false;
    if (f.sectors.size && !f.sectors.has(e.sec)) return false;
    if (f.sizes.size && !f.sizes.has(e.sz)) return false;
    if (f.divisions.size && !f.divisions.has(e.div)) return false;
    if (!matchesDirection(f.direction, e[metric])) return false;
    return true;
  });
}

/** Filter for entities that only have sector/size (groups reuse this). */
export function filterGroups<T extends Entity>(list: T[], f: Filters, metric: MetricKey): T[] {
  const q = f.search.trim().toLowerCase();
  return list.filter((e) => {
    if (q && !e.n.toLowerCase().includes(q)) return false;
    if (f.sectors.size && !f.sectors.has(e.sec)) return false;
    if (f.sizes.size && !f.sizes.has(e.sz)) return false;
    if (!matchesDirection(f.direction, e[metric])) return false;
    return true;
  });
}

export type SortKey = 'name' | 'gap' | 'abs' | 'women' | 'change' | 'pay';
export type SortDir = 'asc' | 'desc';

export function sortEntities<T extends Entity>(
  list: T[],
  key: SortKey,
  dir: SortDir,
  metric: MetricKey,
): T[] {
  const prior = priorKeyFor(metric);
  const sign = dir === 'asc' ? 1 : -1;
  // Nulls always sort to the bottom regardless of direction.
  const val = (e: T): number | null => {
    switch (key) {
      case 'name':
        return null; // handled separately
      case 'gap':
        return e[metric];
      case 'abs':
        return e[metric] === null ? null : Math.abs(e[metric] as number);
      case 'women':
        return e.w[0];
      case 'pay':
        return e.r[0];
      case 'change': {
        const cur = e[metric];
        const pv = e[prior];
        return cur === null || pv === null ? null : cur - pv;
      }
    }
  };
  const copy = [...list];
  copy.sort((a, b) => {
    if (key === 'name') return sign * a.n.localeCompare(b.n);
    const av = val(a);
    const bv = val(b);
    if (av === null && bv === null) return a.n.localeCompare(b.n);
    if (av === null) return 1;
    if (bv === null) return -1;
    if (av === bv) return a.n.localeCompare(b.n);
    return sign * (av - bv);
  });
  return copy;
}

export interface Bin {
  lo: number;
  hi: number;
  count: number;
  inTarget: boolean;
}

/** Histogram of gap values into fixed-width bins (in decimal). */
export function histogram(values: (number | null)[], binWidth = 0.05, min = -0.3, max = 0.6): Bin[] {
  const round = (x: number) => Math.round(x * 1000) / 1000;
  const n = Math.round((max - min) / binWidth);
  const bins: Bin[] = [];
  for (let i = 0; i < n; i++) {
    const lo = round(min + i * binWidth);
    const hi = round(lo + binWidth);
    const mid = (lo + hi) / 2;
    bins.push({ lo, hi, count: 0, inTarget: Math.abs(mid) < TARGET_BAND });
  }
  for (const raw of values) {
    if (raw === null || !Number.isFinite(raw)) continue;
    const v = Math.max(min, Math.min(max - 1e-9, raw));
    const idx = Math.min(bins.length - 1, Math.max(0, Math.floor((v - min) / binWidth)));
    bins[idx].count++;
  }
  return bins;
}

export interface IndustryAgg {
  div: number;
  name: string;
  count: number;
  medianGap: number | null;
  medianWomen: number | null;
  medianUpperWomen: number | null;
  medianPay: number | null;
}

export function aggregateIndustries(employers: Employer[], meta: Meta, metric: MetricKey): IndustryAgg[] {
  return meta.divisions
    .map((name, div) => {
      const es = employers.filter((e) => e.div === div);
      return {
        div,
        name,
        count: es.length,
        medianGap: median(es.map((e) => e[metric])),
        medianWomen: median(es.map((e) => e.w[0])),
        medianUpperWomen: median(es.map((e) => e.w[1])),
        medianPay: median(es.map((e) => e.r[0])),
      };
    })
    .filter((x) => x.count > 0);
}

/** Median % women in each of the four pay quartiles across a set of entities. */
export function quartileWomen(list: Entity[]): (number | null)[] {
  return [1, 2, 3, 4].map((qi) => median(list.map((e) => e.w[qi])));
}

export interface Mover {
  entity: Entity;
  current: number;
  prior: number;
  change: number; // current - prior (negative = gap narrowed)
}

/** Employers with the largest year-on-year change, split by direction. */
export function movers(list: Entity[], metric: MetricKey, minSizeIndex = 0): { improved: Mover[]; worsened: Mover[] } {
  const prior = priorKeyFor(metric);
  const withBoth: Mover[] = [];
  for (const e of list) {
    if (e.sz < minSizeIndex) continue;
    const cur = e[metric];
    const pv = e[prior];
    if (cur === null || pv === null) continue;
    withBoth.push({ entity: e, current: cur, prior: pv, change: cur - pv });
  }
  const improved = [...withBoth].filter((m) => m.change < 0).sort((a, b) => a.change - b.change);
  const worsened = [...withBoth].filter((m) => m.change > 0).sort((a, b) => b.change - a.change);
  return { improved, worsened };
}

export type Severity = 'info' | 'warn' | 'alert' | 'good';
export interface Insight {
  severity: Severity;
  title: string;
  body: string;
}

/** Auto-generated findings across the whole employer dataset. */
export function buildInsights(employers: Employer[], meta: Meta, metric: MetricKey): Insight[] {
  const out: Insight[] = [];
  const gaps = employers.map((e) => e[metric]).filter((v): v is number => v !== null);
  const total = gaps.length;
  if (!total) return out;

  const favMen = gaps.filter((v) => v > TARGET_BAND).length;
  const favWomen = gaps.filter((v) => v < -TARGET_BAND).length;
  const inTarget = total - favMen - favWomen;

  out.push({
    severity: 'info',
    title: `${((favMen / total) * 100).toFixed(0)}% of employers pay men more`,
    body: `Of ${total.toLocaleString('en-AU')} employers, ${favMen.toLocaleString('en-AU')} have a gap above +5% (favouring men), ${favWomen.toLocaleString('en-AU')} below −5% (favouring women), and ${inTarget.toLocaleString('en-AU')} sit inside the ±5% target zone.`,
  });

  // Industry extremes.
  const inds = aggregateIndustries(employers, meta, metric).filter((i) => i.count >= 20);
  const sorted = [...inds].sort((a, b) => (b.medianGap ?? -1) - (a.medianGap ?? -1));
  if (sorted.length) {
    const worst = sorted[0];
    const best = sorted[sorted.length - 1];
    out.push({
      severity: 'warn',
      title: `${worst.name} has the widest typical gap`,
      body: `The median employer in ${worst.name} reports a ${((worst.medianGap ?? 0) * 100).toFixed(1)}% gap — the highest of any industry with 20+ employers. ${best.name} is lowest at ${((best.medianGap ?? 0) * 100).toFixed(1)}%.`,
    });
  }

  // Representation / glass ceiling.
  const upper = median(employers.map((e) => e.w[1]));
  const lower = median(employers.map((e) => e.w[4]));
  if (upper !== null && lower !== null) {
    out.push({
      severity: 'info',
      title: 'Women cluster in the lowest-paid quartile',
      body: `Across employers, women are a median ${(upper * 100).toFixed(0)}% of the top pay quartile but ${(lower * 100).toFixed(0)}% of the bottom quartile — the structural pattern behind most pay gaps.`,
    });
  }

  // Employers where women out-earn men by a lot.
  const womenAhead = employers
    .filter((e) => e[metric] !== null && (e[metric] as number) <= -0.15)
    .sort((a, b) => (a[metric] as number) - (b[metric] as number));
  if (womenAhead.length) {
    out.push({
      severity: 'good',
      title: `${womenAhead.length.toLocaleString('en-AU')} employers pay women 15%+ more`,
      body: `Led by ${womenAhead[0].n}, where the ${METRICS.find((m) => m.key === metric)?.short.toLowerCase()} gap is ${((womenAhead[0][metric] as number) * 100).toFixed(1)}% in favour of women.`,
    });
  }

  // Extreme gaps favouring men.
  const extreme = employers
    .filter((e) => e[metric] !== null && (e[metric] as number) >= 0.4)
    .sort((a, b) => (b[metric] as number) - (a[metric] as number));
  if (extreme.length) {
    out.push({
      severity: 'alert',
      title: `${extreme.length.toLocaleString('en-AU')} employers report a 40%+ gap favouring men`,
      body: `The widest is ${extreme[0].n} at ${((extreme[0][metric] as number) * 100).toFixed(1)}%. Large gaps often reflect very few women in senior, higher-paid roles.`,
    });
  }

  // Year-on-year movement summary.
  const { improved, worsened } = movers(employers, metric);
  if (improved.length || worsened.length) {
    out.push({
      severity: improved.length >= worsened.length ? 'good' : 'warn',
      title: `${improved.length.toLocaleString('en-AU')} narrowed their gap, ${worsened.length.toLocaleString('en-AU')} widened it`,
      body: `Comparing ${meta.reportingYear} with ${meta.priorYear} for employers reported in both years. The biggest single improvement was ${improved[0]?.entity.n ?? '—'} (${improved[0] ? (improved[0].change * 100).toFixed(1) : '—'} pts).`,
    });
  }

  return out;
}

/** Correlation-style scatter points: upper-quartile women vs gap. */
export function scatterPoints(employers: Employer[], metric: MetricKey): { x: number; y: number; e: Employer }[] {
  const pts: { x: number; y: number; e: Employer }[] = [];
  for (const e of employers) {
    const g = e[metric];
    const w = e.w[1];
    if (g === null || w === null) continue;
    pts.push({ x: w, y: g, e });
  }
  return pts;
}
