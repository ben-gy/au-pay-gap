import { describe, expect, it } from 'vitest';
import { fmtPct, fmtGap, fmtPointsChange, fmtMoney, fmtNumber, slugify } from '../src/format.ts';

describe('fmtPct', () => {
  it('formats a decimal fraction as a percentage', () => {
    expect(fmtPct(0.244)).toBe('24.4%');
  });
  it('respects decimal places', () => {
    expect(fmtPct(0.5, 0)).toBe('50%');
  });
  it('handles zero', () => {
    expect(fmtPct(0)).toBe('0.0%');
  });
  it('returns em dash for null/undefined/NaN', () => {
    expect(fmtPct(null)).toBe('—');
    expect(fmtPct(undefined)).toBe('—');
    expect(fmtPct(NaN)).toBe('—');
  });
});

describe('fmtGap', () => {
  it('formats a positive gap without a sign', () => {
    expect(fmtGap(0.244)).toBe('24.4%');
  });
  it('uses a proper minus glyph for negatives', () => {
    expect(fmtGap(-0.032)).toBe('−3.2%');
  });
  it('handles zero', () => {
    expect(fmtGap(0)).toBe('0.0%');
  });
  it('returns dash for null', () => {
    expect(fmtGap(null)).toBe('—');
  });
});

describe('fmtPointsChange', () => {
  it('adds a plus sign for increases', () => {
    expect(fmtPointsChange(0.02)).toBe('+2.0 pts');
  });
  it('uses a minus glyph for decreases', () => {
    expect(fmtPointsChange(-0.015)).toBe('−1.5 pts');
  });
  it('handles zero', () => {
    expect(fmtPointsChange(0)).toBe('0.0 pts');
  });
  it('handles null', () => {
    expect(fmtPointsChange(null)).toBe('—');
  });
});

describe('fmtMoney', () => {
  it('formats with locale separators and dollar sign', () => {
    expect(fmtMoney(153000)).toBe('$153,000');
  });
  it('rounds to whole dollars', () => {
    expect(fmtMoney(1234.56)).toBe('$1,235');
  });
  it('handles null', () => {
    expect(fmtMoney(null)).toBe('—');
  });
});

describe('fmtNumber', () => {
  it('adds thousands separators', () => {
    expect(fmtNumber(1234567)).toBe('1,234,567');
  });
  it('handles zero', () => {
    expect(fmtNumber(0)).toBe('0');
  });
});

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('BHP Group Ltd')).toBe('bhp-group-ltd');
  });
  it('trims leading/trailing separators', () => {
    expect(slugify('  Hello! World  ')).toBe('hello-world');
  });
});
