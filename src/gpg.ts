// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Semantics of a gender pay gap value: direction, plain-language framing, and
// an accessible diverging colour scale.
//
// Convention (WGEA): a POSITIVE gap favours men (men earn more); a NEGATIVE gap
// favours women. WGEA treats the range −5% .. +5% as the "target zone".

export const TARGET_BAND = 0.05;

export type Direction = 'men' | 'women' | 'equal';

export function direction(v: number | null | undefined): Direction {
  if (v === null || v === undefined || !Number.isFinite(v)) return 'equal';
  if (v > TARGET_BAND) return 'men';
  if (v < -TARGET_BAND) return 'women';
  return 'equal';
}

/** Short plain-language description, e.g. "favours men". */
export function directionLabel(v: number | null | undefined): string {
  switch (direction(v)) {
    case 'men':
      return 'favours men';
    case 'women':
      return 'favours women';
    default:
      return 'within target zone';
  }
}

/** Longer sentence for the detail panel. */
export function plainLanguage(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return 'No data reported for this measure.';
  const pct = (Math.abs(v) * 100).toFixed(1);
  if (v > TARGET_BAND) return `Men are paid ${pct}% more than women, on average, for this measure.`;
  if (v < -TARGET_BAND) return `Women are paid ${pct}% more than men, on average, for this measure.`;
  if (v === 0) return `Pay is equal between women and men for this measure.`;
  return `The gap of ${pct}% sits inside WGEA's ±5% target zone.`;
}

// Diverging palette. Amber -> red as the gap widens in favour of men; teal as
// it widens in favour of women; neutral green inside the target band.
const MEN_STOPS: [number, string][] = [
  [0.05, '#84cc16'], // edge of target (lime-ish, still ok)
  [0.1, '#facc15'], // amber
  [0.2, '#f59e0b'],
  [0.3, '#ea580c'],
  [0.45, '#b91c1c'], // deep red
];
const WOMEN_STOPS: [number, string][] = [
  [0.05, '#5eead4'],
  [0.15, '#2dd4bf'],
  [0.3, '#0d9488'],
];

function lerpColor(a: string, b: string, t: number): string {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function scale(stops: [number, string][], mag: number): string {
  if (mag <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (mag <= stops[i][0]) {
      const [lo, loC] = stops[i - 1];
      const [hi, hiC] = stops[i];
      return lerpColor(loC, hiC, (mag - lo) / (hi - lo));
    }
  }
  return stops[stops.length - 1][1];
}

/** Colour for a gap value. Returns a CSS colour string. */
export function gapColor(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return 'var(--text-muted)';
  const mag = Math.abs(v);
  if (mag <= TARGET_BAND) return '#16a34a'; // in target zone: green
  return v > 0 ? scale(MEN_STOPS, mag) : scale(WOMEN_STOPS, mag);
}

/** Class name for a gap value, for chips/badges. */
export function gapClass(v: number | null | undefined): 'men' | 'women' | 'target' | 'none' {
  if (v === null || v === undefined || !Number.isFinite(v)) return 'none';
  const d = direction(v);
  if (d === 'men') return 'men';
  if (d === 'women') return 'women';
  return 'target';
}
