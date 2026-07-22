// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Data model. Records use compact keys to keep the JSON payload small; these
// interfaces document what each key means. Values are decimals unless noted
// (e.g. a GPG of 0.244 means 24.4%; positive = favours men, negative = women).

/** Which gender pay gap number to display. */
export type MetricKey = 'mt' | 'at' | 'mb' | 'ab';
/** Matching prior-year (2023-24) key for a given current metric. */
export type PriorKey = 'pmt' | 'pat' | 'pmb' | 'pab';

export interface Employer {
  /** Employer name */
  n: string;
  /** ABN */
  abn: string;
  /** Sector index into meta.sectors (0 = Private, 1 = Public) */
  sec: number;
  /** Employer size index into meta.sizes */
  sz: number;
  /** ANZSIC division index into meta.divisions (-1 if unknown) */
  div: number;
  /** ANZSIC class index into meta.classes (-1 if unknown) */
  cls: number;
  /** 2024-25 GPG: average total remuneration */
  at: number | null;
  /** 2024-25 GPG: average base salary */
  ab: number | null;
  /** 2024-25 GPG: median total remuneration */
  mt: number | null;
  /** 2024-25 GPG: median base salary */
  mb: number | null;
  /** 2023-24 GPG (nullable when no comparison available) */
  pat: number | null;
  pab: number | null;
  pmt: number | null;
  pmb: number | null;
  /** Women fraction: [total, upper Q, upper-mid Q, lower-mid Q, lower Q] */
  w: (number | null)[];
  /** Average total remuneration $: [total, upper, upper-mid, lower-mid, lower] */
  r: (number | null)[];
}

/** Corporate groups lack ANZSIC industry/class and ABN. */
export interface Group {
  n: string;
  sec: number;
  sz: number;
  at: number | null;
  ab: number | null;
  mt: number | null;
  mb: number | null;
  pat: number | null;
  pab: number | null;
  pmt: number | null;
  pmb: number | null;
  w: (number | null)[];
  r: (number | null)[];
}

export interface IndustryStat {
  name: string;
  count: number;
  medianMt: number | null;
  medianAt: number | null;
  medianWomen: number | null;
  medianUpperWomen: number | null;
}

export interface Meta {
  reportingYear: string;
  priorYear: string;
  source: string;
  sourceUrl: string;
  generatedAt: string;
  sectors: string[];
  sizes: string[];
  divisions: string[];
  classes: string[];
  counts: {
    employers: number;
    favourMen: number;
    favourWomen: number;
    inTargetZone: number;
  };
  national: {
    medianMedianTotalGpg: number;
    medianAvgTotalGpg: number;
    medianWomenTotal: number;
    medianWomenUpper: number;
    medianWomenLower: number;
  };
  industries: IndustryStat[];
}

export interface Dataset {
  meta: Meta;
  employers: Employer[];
  groups: Group[];
}

/** Any entity that has GPG numbers (employer or group). */
export type Entity = Employer | Group;

export const METRICS: { key: MetricKey; prior: PriorKey; label: string; short: string; prose: string }[] = [
  { key: 'mt', prior: 'pmt', label: 'Median · total remuneration', short: 'Median total', prose: 'median total-remuneration' },
  { key: 'at', prior: 'pat', label: 'Average · total remuneration', short: 'Average total', prose: 'average total-remuneration' },
  { key: 'mb', prior: 'pmb', label: 'Median · base salary', short: 'Median base', prose: 'median base-salary' },
  { key: 'ab', prior: 'pab', label: 'Average · base salary', short: 'Average base', prose: 'average base-salary' },
];

export const metricProse = (key: MetricKey): string => METRICS.find((m) => m.key === key)?.prose ?? '';

export const QUARTILE_LABELS = ['Upper', 'Upper-middle', 'Lower-middle', 'Lower'];
