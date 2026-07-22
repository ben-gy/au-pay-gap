// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Slide-in detail panel for a single employer or corporate group.

import type { Store } from '../state.ts';
import type { Employer, Entity } from '../types.ts';
import { METRICS, QUARTILE_LABELS } from '../types.ts';
import { el, clear, withGlossary } from '../dom.ts';
import { fmtGap, fmtMoney, fmtPointsChange } from '../format.ts';
import { gapColor, gapClass, directionLabel, plainLanguage } from '../gpg.ts';
import { median } from '../analysis.ts';

function findEntity(store: Store): Entity | null {
  const s = store.get();
  if (!s.selected) return null;
  if (s.mode === 'employers') {
    return s.dataset.employers.find((e) => e.abn === s.selected) || null;
  }
  return s.dataset.groups.find((g) => g.n === s.selected) || null;
}

function metricCard(entity: Entity, key: 'mt' | 'at' | 'mb' | 'ab'): HTMLElement {
  const m = METRICS.find((x) => x.key === key)!;
  const cur = entity[key];
  const prior = entity[m.prior];
  const change = cur !== null && prior !== null ? cur - prior : null;
  const card = el('div', { class: `metric-card gap-${gapClass(cur)}` });
  card.append(el('div', { class: 'metric-card-label', text: m.short }));
  const val = el('div', { class: 'metric-card-value' }, [fmtGap(cur)]);
  val.style.color = gapColor(cur);
  card.append(val);
  if (change !== null) {
    const dir = change < 0 ? 'down' : change > 0 ? 'up' : 'flat';
    const good = change < 0; // narrowing is good
    card.append(
      el('div', { class: `metric-card-change ${good ? 'good' : dir === 'flat' ? 'flat' : 'bad'}` }, [
        `${dir === 'down' ? '▼' : dir === 'up' ? '▲' : '■'} ${fmtPointsChange(change)} vs prior yr`,
      ]),
    );
  } else {
    card.append(el('div', { class: 'metric-card-change flat', text: 'no prior-year comparison' }));
  }
  return card;
}

function comparisonRow(label: string, value: number | null, max: number): HTMLElement {
  const row = el('div', { class: 'cmp-row' });
  row.append(el('div', { class: 'cmp-label', text: label }));
  const track = el('div', { class: 'cmp-track' });
  const mag = value === null ? 0 : Math.abs(value);
  const bar = el('div', { class: 'cmp-bar' });
  bar.style.width = `${Math.min(100, (mag / max) * 100)}%`;
  bar.style.background = gapColor(value);
  track.append(bar);
  row.append(track);
  const v = el('div', { class: 'cmp-value', text: fmtGap(value) });
  v.style.color = gapColor(value);
  row.append(v);
  return row;
}

function quartileRow(entity: Entity, qi: number): HTMLElement {
  const label = QUARTILE_LABELS[qi - 1];
  const womenPct = entity.w[qi];
  const pay = entity.r[qi];
  const row = el('div', { class: 'quart-row' });
  row.append(el('div', { class: 'quart-label', text: label }));
  const track = el('div', { class: 'quart-track', 'aria-label': `${label} quartile representation` });
  const women = el('div', { class: 'quart-women' });
  women.style.width = `${(womenPct ?? 0) * 100}%`;
  const men = el('div', { class: 'quart-men' });
  men.style.width = `${(1 - (womenPct ?? 0)) * 100}%`;
  track.append(women, men);
  row.append(track);
  row.append(el('div', { class: 'quart-meta' }, [
    el('span', { class: 'quart-wpct', text: womenPct === null ? '—' : `${Math.round(womenPct * 100)}% women` }),
    el('span', { class: 'quart-pay', text: fmtMoney(pay) }),
  ]));
  return row;
}

export function renderDetail(host: HTMLElement, store: Store): void {
  clear(host);
  const entity = findEntity(store);
  const s = store.get();
  if (!entity) {
    host.classList.remove('open');
    return;
  }
  host.classList.add('open');

  const panel = el('div', { class: 'detail-panel', role: 'dialog', 'aria-label': `${entity.n} details` });

  // Header
  const head = el('div', { class: 'detail-head' });
  const titleWrap = el('div', { class: 'detail-title-wrap' });
  titleWrap.append(el('h2', { class: 'detail-title', text: entity.n }));
  const tags = el('div', { class: 'detail-tags' });
  tags.append(el('span', { class: 'tag', text: s.dataset.meta.sectors[entity.sec] }));
  tags.append(el('span', { class: 'tag', text: `${s.dataset.meta.sizes[entity.sz]} staff` }));
  if ('div' in entity && (entity as Employer).div >= 0) {
    tags.append(el('span', { class: 'tag', text: s.dataset.meta.divisions[(entity as Employer).div] }));
  }
  if ('abn' in entity && (entity as Employer).abn) {
    tags.append(el('span', { class: 'tag tag-mono', text: `ABN ${(entity as Employer).abn}` }));
  }
  titleWrap.append(tags);
  head.append(titleWrap);
  const close = el('button', { class: 'detail-close', 'aria-label': 'Close', type: 'button' }, ['×']);
  close.addEventListener('click', () => store.select(null));
  head.append(close);
  panel.append(head);

  const scroll = el('div', { class: 'detail-scroll' });

  // Headline for the active metric
  const activeVal = entity[s.metric];
  const headline = el('div', { class: `detail-headline gap-${gapClass(activeVal)}` });
  const big = el('div', { class: 'detail-big', text: fmtGap(activeVal) });
  big.style.color = gapColor(activeVal);
  headline.append(big);
  headline.append(el('div', { class: 'detail-headline-sub' }, [
    el('strong', { text: directionLabel(activeVal) }),
    ` · ${METRICS.find((m) => m.key === s.metric)?.label}`,
  ]));
  headline.append(el('p', { class: 'detail-plain', text: plainLanguage(activeVal) }));
  scroll.append(headline);

  // Four metric cards
  scroll.append(el('h3', { class: 'detail-h', html: 'All four measures' }));
  const grid = el('div', { class: 'metric-grid' });
  (['mt', 'at', 'mb', 'ab'] as const).forEach((k) => grid.append(metricCard(entity, k)));
  scroll.append(grid);

  // Benchmark comparison
  const benchHead = el('h3', { class: 'detail-h' });
  benchHead.append('How it compares');
  scroll.append(benchHead);
  const natl = median(s.dataset.employers.map((e) => e[s.metric]));
  let indMedian: number | null = null;
  let indName = '';
  if ('div' in entity && (entity as Employer).div >= 0) {
    const div = (entity as Employer).div;
    indName = s.dataset.meta.divisions[div];
    indMedian = median(s.dataset.employers.filter((e) => e.div === div).map((e) => e[s.metric]));
  }
  const maxCmp = Math.max(0.1, Math.abs(activeVal ?? 0), Math.abs(natl ?? 0), Math.abs(indMedian ?? 0)) * 1.15;
  const cmp = el('div', { class: 'cmp-block' });
  cmp.append(comparisonRow('This employer', activeVal, maxCmp));
  if (indMedian !== null) cmp.append(comparisonRow(`${indName} median`, indMedian, maxCmp));
  cmp.append(comparisonRow('All employers (median)', natl, maxCmp));
  scroll.append(cmp);

  // Representation pyramid
  const pyrHead = el('h3', { class: 'detail-h' });
  pyrHead.append(withGlossary('Women across pay quartiles', 'quartile'));
  scroll.append(pyrHead);
  scroll.append(
    el('p', { class: 'detail-note', text: `Overall workforce: ${entity.w[0] === null ? '—' : Math.round(entity.w[0] * 100) + '% women'}. The bars below show each pay quartile from highest-paid (top) to lowest-paid.` }),
  );
  const pyr = el('div', { class: 'quart-block' });
  [1, 2, 3, 4].forEach((qi) => pyr.append(quartileRow(entity, qi)));
  const legend = el('div', { class: 'quart-legend' }, [
    el('span', { class: 'lg lg-women', text: 'Women' }),
    el('span', { class: 'lg lg-men', text: 'Men' }),
  ]);
  pyr.append(legend);
  scroll.append(pyr);

  // Pay ladder summary
  scroll.append(el('h3', { class: 'detail-h', text: 'Average pay by quartile' }));
  const ladder = el('div', { class: 'ladder' });
  const maxPay = Math.max(1, ...entity.r.slice(1).map((v) => v ?? 0));
  QUARTILE_LABELS.forEach((label, i) => {
    const pay = entity.r[i + 1];
    const bar = el('div', { class: 'ladder-row' });
    bar.append(el('div', { class: 'ladder-label', text: label }));
    const track = el('div', { class: 'ladder-track' });
    const fill = el('div', { class: 'ladder-fill' });
    fill.style.width = `${((pay ?? 0) / maxPay) * 100}%`;
    track.append(fill);
    bar.append(track);
    bar.append(el('div', { class: 'ladder-val', text: fmtMoney(pay) }));
    ladder.append(bar);
  });
  scroll.append(ladder);

  scroll.append(
    el('p', { class: 'detail-source' }, [
      `Total workforce average pay: ${fmtMoney(entity.r[0])}. Reporting year ${s.dataset.meta.reportingYear}. Figures self-reported to WGEA and rounded to the nearest $1,000.`,
    ]),
  );

  panel.append(scroll);
  host.append(panel);
}
