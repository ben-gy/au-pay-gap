import { describe, expect, it } from 'vitest';
import {
  median,
  mean,
  emptyFilters,
  filterEmployers,
  sortEntities,
  histogram,
  aggregateIndustries,
  quartileWomen,
  movers,
  buildInsights,
  priorKeyFor,
} from '../src/analysis.ts';
import type { Employer, Meta } from '../src/types.ts';

function emp(partial: Partial<Employer>): Employer {
  return {
    n: 'Test Co',
    abn: '11111111111',
    sec: 0,
    sz: 0,
    div: 0,
    cls: 0,
    at: 0.1,
    ab: 0.1,
    mt: 0.1,
    mb: 0.1,
    pat: null,
    pab: null,
    pmt: null,
    pmb: null,
    w: [0.5, 0.4, 0.5, 0.6, 0.6],
    r: [100000, 200000, 110000, 90000, 70000],
    ...partial,
  };
}

const meta: Meta = {
  reportingYear: '2024-25',
  priorYear: '2023-24',
  source: 'WGEA',
  sourceUrl: 'https://example.com',
  generatedAt: '2026-07-12T00:00:00Z',
  sectors: ['Private', 'Public'],
  sizes: ['<250', '250-499', '500-999', '1000-4999', '5000+'],
  divisions: ['Mining', 'Retail Trade'],
  classes: ['A', 'B'],
  counts: { employers: 0, favourMen: 0, favourWomen: 0, inTargetZone: 0 },
  national: {
    medianMedianTotalGpg: 0,
    medianAvgTotalGpg: 0,
    medianWomenTotal: 0,
    medianWomenUpper: 0,
    medianWomenLower: 0,
  },
  industries: [],
};

describe('median / mean', () => {
  it('computes the median of an odd-length list', () => {
    expect(median([3, 1, 2])).toBe(2);
  });
  it('computes the median of an even-length list', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it('ignores nulls', () => {
    expect(median([null, 2, 4, null])).toBe(3);
  });
  it('returns null for an empty list', () => {
    expect(median([])).toBeNull();
    expect(mean([null])).toBeNull();
  });
  it('computes a mean', () => {
    expect(mean([2, 4, 6])).toBe(4);
  });
});

describe('priorKeyFor', () => {
  it('maps current metrics to their prior-year key', () => {
    expect(priorKeyFor('mt')).toBe('pmt');
    expect(priorKeyFor('ab')).toBe('pab');
  });
});

describe('filterEmployers', () => {
  const list = [
    emp({ n: 'Alpha Mining', div: 0, sec: 0, sz: 0, mt: 0.3 }),
    emp({ n: 'Beta Retail', div: 1, sec: 1, sz: 2, mt: -0.1 }),
    emp({ n: 'Gamma Retail', div: 1, sec: 0, sz: 0, mt: 0.02 }),
  ];
  it('filters by search across name', () => {
    expect(filterEmployers(list, { ...emptyFilters(), search: 'beta' }, 'mt')).toHaveLength(1);
  });
  it('filters by division', () => {
    expect(filterEmployers(list, { ...emptyFilters(), divisions: new Set([1]) }, 'mt')).toHaveLength(2);
  });
  it('filters by gap direction', () => {
    expect(filterEmployers(list, { ...emptyFilters(), direction: 'men' }, 'mt')).toHaveLength(1);
    expect(filterEmployers(list, { ...emptyFilters(), direction: 'women' }, 'mt')).toHaveLength(1);
    expect(filterEmployers(list, { ...emptyFilters(), direction: 'target' }, 'mt')).toHaveLength(1);
  });
  it('returns all with empty filters', () => {
    expect(filterEmployers(list, emptyFilters(), 'mt')).toHaveLength(3);
  });
});

describe('sortEntities', () => {
  const list = [
    emp({ n: 'B', mt: 0.1 }),
    emp({ n: 'A', mt: 0.3 }),
    emp({ n: 'C', mt: null }),
  ];
  it('sorts by gap descending with nulls last', () => {
    const out = sortEntities(list, 'gap', 'desc', 'mt');
    expect(out.map((e) => e.n)).toEqual(['A', 'B', 'C']);
  });
  it('sorts by name ascending', () => {
    const out = sortEntities(list, 'name', 'asc', 'mt');
    expect(out.map((e) => e.n)).toEqual(['A', 'B', 'C']);
  });
  it('sorts by absolute gap', () => {
    const l = [emp({ n: 'x', mt: -0.4 }), emp({ n: 'y', mt: 0.1 })];
    expect(sortEntities(l, 'abs', 'desc', 'mt')[0].n).toBe('x');
  });
});

describe('histogram', () => {
  it('bins values and flags the target zone', () => {
    const bins = histogram([0, 0.2, 0.2, -0.2], 0.05, -0.3, 0.6);
    const total = bins.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(4);
    expect(bins.some((b) => b.inTarget)).toBe(true);
  });
  it('clamps out-of-range values into the end bins', () => {
    const bins = histogram([5], 0.05, -0.3, 0.6);
    expect(bins[bins.length - 1].count).toBe(1);
  });
});

describe('aggregateIndustries', () => {
  it('produces one row per non-empty division', () => {
    const list = [emp({ div: 0, mt: 0.2 }), emp({ div: 0, mt: 0.4 }), emp({ div: 1, mt: 0.0 })];
    const aggs = aggregateIndustries(list, meta, 'mt');
    expect(aggs).toHaveLength(2);
    const mining = aggs.find((a) => a.name === 'Mining')!;
    expect(mining.count).toBe(2);
    expect(mining.medianGap).toBeCloseTo(0.3);
  });
});

describe('quartileWomen', () => {
  it('returns the median share in each of four quartiles', () => {
    const list = [emp({ w: [0.5, 0.3, 0.5, 0.6, 0.7] }), emp({ w: [0.5, 0.5, 0.5, 0.6, 0.7] })];
    const q = quartileWomen(list);
    expect(q[0]).toBeCloseTo(0.4);
    expect(q[3]).toBeCloseTo(0.7);
  });
});

describe('movers', () => {
  it('separates improvers from those who worsened', () => {
    const list = [
      emp({ n: 'Improved', mt: 0.1, pmt: 0.25 }), // narrowed
      emp({ n: 'Worse', mt: 0.3, pmt: 0.1 }), // widened
      emp({ n: 'NoPrior', mt: 0.2, pmt: null }),
    ];
    const { improved, worsened } = movers(list, 'mt');
    expect(improved.map((m) => m.entity.n)).toEqual(['Improved']);
    expect(worsened.map((m) => m.entity.n)).toEqual(['Worse']);
  });
});

describe('buildInsights', () => {
  it('produces at least one insight for a non-trivial dataset', () => {
    const list = [
      emp({ n: 'Big Gap', mt: 0.45, div: 0 }),
      emp({ n: 'Women Ahead', mt: -0.2, div: 1 }),
      emp({ n: 'Normal', mt: 0.08, div: 1 }),
    ];
    const insights = buildInsights(list, meta, 'mt');
    expect(insights.length).toBeGreaterThan(0);
    expect(insights[0].title).toBeTruthy();
  });
  it('returns an empty array when no gap data exists', () => {
    const list = [emp({ mt: null })];
    expect(buildInsights(list, meta, 'mt')).toEqual([]);
  });
});
