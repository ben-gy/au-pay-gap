// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Pure formatting helpers. No DOM. Fully unit-tested.

const MINUS = '−'; // proper minus sign, not hyphen

/** Format a decimal fraction as a percentage, e.g. 0.244 -> "24.4%". */
export function fmtPct(v: number | null | undefined, dp = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return `${(v * 100).toFixed(dp)}%`;
}

/**
 * Format a gap fraction with an explicit sign and a proper minus glyph.
 * 0.244 -> "24.4%", -0.032 -> "−3.2%", 0 -> "0.0%".
 */
export function fmtGap(v: number | null | undefined, dp = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const pct = Math.abs(v) * 100;
  const s = pct.toFixed(dp);
  if (v < 0) return `${MINUS}${s}%`;
  return `${s}%`;
}

/** Format a change in percentage points, always signed. +0.02 -> "+2.0 pts". */
export function fmtPointsChange(v: number | null | undefined, dp = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const pts = v * 100;
  const s = Math.abs(pts).toFixed(dp);
  if (pts > 0) return `+${s} pts`;
  if (pts < 0) return `${MINUS}${s} pts`;
  return `0.0 pts`;
}

/** Format an integer dollar amount with locale separators. */
export function fmtMoney(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return `$${Math.round(v).toLocaleString('en-AU')}`;
}

/** Format a whole number with locale separators. */
export function fmtNumber(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return Math.round(v).toLocaleString('en-AU');
}

/** Slugify an ABN/name for use in a URL hash. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
