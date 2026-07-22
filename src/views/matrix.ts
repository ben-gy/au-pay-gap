// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Matrix: industry (rows) × employer size (columns) heatmap of the median gap.

import type { Store } from '../state.ts';
import { el, clear } from '../dom.ts';
import { fmtGap, fmtNumber } from '../format.ts';
import { median } from '../analysis.ts';
import { gapColor } from '../gpg.ts';
import { metricProse } from '../types.ts';
import { hoverTip } from '../charts.ts';
import { viewHeader } from './industries.ts';

export function renderMatrix(host: HTMLElement, store: Store): void {
  clear(host);
  const s = store.get();
  const meta = s.dataset.meta;
  const emps = s.dataset.employers;

  host.append(
    viewHeader(
      'Industry × size heatmap',
      `Each cell is the ${metricProse(s.metric)} gap — median across employers — for that industry and size combination. Deeper red = a wider gap favouring men; teal = favouring women; green = inside the ±5% target zone. Click a cell to explore those employers.`,
    ),
  );

  // Precompute cell aggregates
  type Cell = { gap: number | null; count: number };
  const rows = meta.divisions.map((name, div) => {
    const cells: Cell[] = meta.sizes.map((_, sz) => {
      const es = emps.filter((e) => e.div === div && e.sz === sz);
      return { gap: median(es.map((e) => e[s.metric])), count: es.length };
    });
    const all = emps.filter((e) => e.div === div);
    return { name, div, cells, total: all.length, rowMedian: median(all.map((e) => e[s.metric])) };
  });
  rows.sort((a, b) => (b.rowMedian ?? -9) - (a.rowMedian ?? -9));

  const wrap = el('div', { class: 'matrix-wrap' });
  const table = el('table', { class: 'matrix-table' });

  const thead = el('thead');
  const htr = el('tr');
  htr.append(el('th', { class: 'mx-corner', text: 'Industry ↓  /  Size →' }));
  meta.sizes.forEach((sz) => htr.append(el('th', { class: 'mx-colh', text: sz })));
  htr.append(el('th', { class: 'mx-colh mx-all', text: 'All' }));
  thead.append(htr);
  table.append(thead);

  const tbody = el('tbody');
  for (const r of rows) {
    const tr = el('tr');
    tr.append(el('th', { class: 'mx-rowh', scope: 'row', text: r.name }));
    r.cells.forEach((cell, sz) => {
      const td = el('td', { class: 'mx-cell' });
      if (cell.count === 0 || cell.gap === null) {
        td.classList.add('mx-empty');
        td.textContent = '·';
      } else {
        td.style.background = gapColor(cell.gap);
        td.style.color = pickText(cell.gap);
        td.textContent = fmtGap(cell.gap, 0);
        td.classList.add('mx-filled');
        hoverTip(
          td,
          () => `<b>${r.name}</b><br>${meta.sizes[sz]} staff<br>Median gap: ${fmtGap(cell.gap)}<br>${fmtNumber(cell.count)} employers`,
        );
        td.addEventListener('click', () => {
          store.patchFilters({ divisions: new Set([r.div]), sizes: new Set([sz]) });
          store.set({ view: 'explorer', page: 0 });
        });
      }
      tr.append(td);
    });
    // Row "All" summary
    const allTd = el('td', { class: 'mx-cell mx-all' });
    if (r.rowMedian !== null) {
      allTd.style.background = gapColor(r.rowMedian);
      allTd.style.color = pickText(r.rowMedian);
      allTd.textContent = fmtGap(r.rowMedian, 0);
      hoverTip(allTd, () => `<b>${r.name}</b><br>All sizes · median ${fmtGap(r.rowMedian)}<br>${fmtNumber(r.total)} employers`);
      allTd.addEventListener('click', () => {
        store.patchFilters({ divisions: new Set([r.div]), sizes: new Set() });
        store.set({ view: 'explorer', page: 0 });
      });
    }
    tr.append(allTd);
    tbody.append(tr);
  }
  table.append(tbody);
  wrap.append(table);
  host.append(wrap);

  // Colour legend
  host.append(legend());
}

// Choose black/white text for contrast against the cell colour.
function pickText(gap: number): string {
  const mag = Math.abs(gap);
  if (mag <= 0.05) return '#fff';
  if (gap > 0 && mag >= 0.18) return '#fff';
  if (gap < 0 && mag >= 0.15) return '#fff';
  return '#1a1a1a';
}

function legend(): HTMLElement {
  const wrap = el('div', { class: 'mx-legend' });
  const stops = [-0.25, -0.1, 0, 0.1, 0.2, 0.35];
  const scale = el('div', { class: 'mx-legend-scale' });
  for (const v of stops) {
    const cell = el('div', { class: 'mx-legend-cell' });
    cell.style.background = gapColor(v);
    cell.textContent = fmtGap(v, 0);
    cell.style.color = pickText(v);
    scale.append(cell);
  }
  wrap.append(el('span', { class: 'mx-legend-label', text: 'Favours women' }));
  wrap.append(scale);
  wrap.append(el('span', { class: 'mx-legend-label', text: 'Favours men' }));
  return wrap;
}
