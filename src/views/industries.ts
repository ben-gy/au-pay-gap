// Industries: rank all 19 ANZSIC divisions by the active metric, with women's
// representation. Click an industry to jump into the explorer filtered to it.

import type { Store } from '../state.ts';
import { el, clear, svgEl, withGlossary } from '../dom.ts';
import { fmtGap, fmtPct, fmtNumber } from '../format.ts';
import { gapColor } from '../gpg.ts';
import { aggregateIndustries } from '../analysis.ts';
import { metricProse } from '../types.ts';
import { hoverTip } from '../charts.ts';

export function renderIndustries(host: HTMLElement, store: Store): void {
  clear(host);
  const s = store.get();
  const inds = aggregateIndustries(s.dataset.employers, s.dataset.meta, s.metric)
    .filter((i) => i.medianGap !== null)
    .sort((a, b) => (b.medianGap ?? 0) - (a.medianGap ?? 0));

  host.append(
    viewHeader(
      'Industry rankings',
      `Each industry's ${metricProse(s.metric)} gap — the median across its employers — for all 19 ANZSIC divisions, highest to lowest. Bars to the right favour men; to the left, women. Click any industry to explore its employers.`,
    ),
  );

  const maxMag = Math.max(0.05, ...inds.map((i) => Math.abs(i.medianGap ?? 0))) * 1.1;
  const list = el('div', { class: 'ind-list' });

  for (const ind of inds) {
    const gap = ind.medianGap ?? 0;
    const rowEl = el('button', { class: 'ind-row', type: 'button' });
    rowEl.addEventListener('click', () => {
      store.patchFilters({ divisions: new Set([ind.div]) });
      store.set({ view: 'explorer', page: 0 });
    });

    const label = el('div', { class: 'ind-label' });
    label.append(el('span', { class: 'ind-name', text: ind.name }));
    label.append(el('span', { class: 'ind-count', text: `${fmtNumber(ind.count)} employers · ${fmtPct(ind.medianWomen, 0)} women` }));
    rowEl.append(label);

    // Diverging bar centred on zero
    const W = 320;
    const H = 30;
    const mid = W / 2;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'ind-bar-svg', preserveAspectRatio: 'none' });
    svg.append(svgEl('line', { x1: mid, y1: 2, x2: mid, y2: H - 2, stroke: 'var(--border-strong)', 'stroke-width': 1 }));
    const barW = (Math.abs(gap) / maxMag) * (W / 2);
    const rect = svgEl('rect', {
      x: gap >= 0 ? mid : mid - barW,
      y: 6,
      width: Math.max(1, barW),
      height: H - 12,
      rx: 3,
      fill: gapColor(gap),
    });
    svg.append(rect);
    hoverTip(svg, () => `<b>${ind.name}</b><br>Median gap: ${fmtGap(gap)}<br>${fmtNumber(ind.count)} employers`);
    const barWrap = el('div', { class: 'ind-bar' }, [svg as unknown as HTMLElement]);
    rowEl.append(barWrap);

    const val = el('div', { class: 'ind-val', text: fmtGap(gap) });
    val.style.color = gapColor(gap);
    rowEl.append(val);

    list.append(rowEl);
  }
  host.append(list);

  // Representation note
  host.append(
    el('div', { class: 'view-footnote' }, [
      withGlossary('Median', 'median'),
      ' is used so a few very high earners don’t distort an industry. Employer counts and women’s share are medians across employers in each division.',
    ]),
  );
}

export function viewHeader(title: string, sub: string): HTMLElement {
  const h = el('div', { class: 'view-header' });
  h.append(el('h2', { class: 'view-title', text: title }));
  h.append(el('p', { class: 'view-sub', text: sub }));
  return h;
}
