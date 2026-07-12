import { describe, expect, it } from 'vitest';
import { direction, directionLabel, plainLanguage, gapColor, gapClass, TARGET_BAND } from '../src/gpg.ts';

describe('direction', () => {
  it('classifies a wide positive gap as favouring men', () => {
    expect(direction(0.2)).toBe('men');
  });
  it('classifies a wide negative gap as favouring women', () => {
    expect(direction(-0.2)).toBe('women');
  });
  it('treats values inside the target band as equal', () => {
    expect(direction(0.03)).toBe('equal');
    expect(direction(-0.03)).toBe('equal');
    expect(direction(TARGET_BAND)).toBe('equal');
  });
  it('treats null as equal', () => {
    expect(direction(null)).toBe('equal');
  });
});

describe('directionLabel', () => {
  it('labels each direction', () => {
    expect(directionLabel(0.2)).toBe('favours men');
    expect(directionLabel(-0.2)).toBe('favours women');
    expect(directionLabel(0)).toBe('within target zone');
  });
});

describe('plainLanguage', () => {
  it('describes men earning more', () => {
    expect(plainLanguage(0.2)).toContain('Men are paid 20.0% more');
  });
  it('describes women earning more', () => {
    expect(plainLanguage(-0.15)).toContain('Women are paid 15.0% more');
  });
  it('handles no data', () => {
    expect(plainLanguage(null)).toContain('No data');
  });
});

describe('gapColor', () => {
  it('returns green inside the target band', () => {
    expect(gapColor(0.02)).toBe('#16a34a');
  });
  it('returns a muted var for null', () => {
    expect(gapColor(null)).toBe('var(--text-muted)');
  });
  it('returns distinct colours for men vs women directions', () => {
    expect(gapColor(0.3)).not.toBe(gapColor(-0.3));
  });
  it('returns an rgb string for out-of-band values', () => {
    expect(gapColor(0.25)).toMatch(/^rgb\(/);
  });
});

describe('gapClass', () => {
  it('maps directions to class names', () => {
    expect(gapClass(0.2)).toBe('men');
    expect(gapClass(-0.2)).toBe('women');
    expect(gapClass(0.01)).toBe('target');
    expect(gapClass(null)).toBe('none');
  });
});
