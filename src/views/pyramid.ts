// The "glass pyramid": women's share across the four pay quartiles. Reveals the
// structural driver of the pay gap — women clustered in lower-paid quartiles.

import type { Store } from '../state.ts';
import { el, clear, withGlossary } from '../dom.ts';
import { fmtPct, fmtNumber } from '../format.ts';
import { median, quartileWomen } from '../analysis.ts';
import { QUARTILE_LABELS } from '../types.ts';
import { viewHeader } from './industries.ts';

function pyramidBlock(title: string, sub: string, quartiles: (number | null)[], overall: number | null): HTMLElement {
  const block = el('div', { class: 'pyramid-block' });
  block.append(el('h3', { class: 'pyramid-title', text: title }));
  if (sub) block.append(el('p', { class: 'pyramid-sub', text: sub }));

  const chart = el('div', { class: 'pyramid-chart' });
  QUARTILE_LABELS.forEach((label, i) => {
    const women = quartiles[i];
    const rowEl = el('div', { class: 'pyr-row' });
    rowEl.append(el('div', { class: 'pyr-qlabel', text: label }));
    const bar = el('div', { class: 'pyr-bar' });
    const w = el('div', { class: 'pyr-w' });
    w.style.width = `${(women ?? 0) * 100}%`;
    if ((women ?? 0) > 0.12) w.append(el('span', { class: 'pyr-bar-text', text: fmtPct(women, 0) }));
    const m = el('div', { class: 'pyr-m' });
    m.style.width = `${(1 - (women ?? 0)) * 100}%`;
    if (1 - (women ?? 0) > 0.12) m.append(el('span', { class: 'pyr-bar-text', text: fmtPct(1 - (women ?? 0), 0) }));
    bar.append(w, m);
    rowEl.append(bar);
    chart.append(rowEl);
  });
  block.append(chart);

  if (overall !== null) {
    block.append(
      el('p', { class: 'pyramid-overall' }, [
        `Overall workforce: `,
        el('strong', { text: fmtPct(overall, 0) }),
        ` women. `,
        (quartiles[0] ?? 0) < overall
          ? `Under-represented by ${((overall - (quartiles[0] ?? 0)) * 100).toFixed(0)} points in the top quartile.`
          : `Well represented at the top.`,
      ]),
    );
  }
  return block;
}

export function renderPyramid(host: HTMLElement, store: Store): void {
  clear(host);
  const s = store.get();
  const emps = s.dataset.employers;

  host.append(
    viewHeader(
      'The glass pyramid',
      'A single pay-gap number hides where women actually sit. These bars show the share of women in each pay quartile — from the best-paid 25% (top) to the least-paid 25% (bottom). When women thin out towards the top, the pay gap widens.',
    ),
  );

  // National pyramid
  const natlQ = quartileWomen(emps);
  const overall = median(emps.map((e) => e.w[0]));
  const grid = el('div', { class: 'pyramid-grid' });
  grid.append(
    pyramidBlock(
      'All Australian employers',
      `Median across ${fmtNumber(emps.length)} employers, ${s.dataset.meta.reportingYear}`,
      natlQ,
      overall,
    ),
  );

  // Legend
  const legend = el('div', { class: 'pyramid-legend' }, [
    el('span', { class: 'lg lg-women' }, [withGlossary('Women', 'quartile')]),
    el('span', { class: 'lg lg-men', text: 'Men' }),
  ]);
  grid.append(legend);
  host.append(grid);

  // Steepest glass ceilings by industry
  host.append(el('h3', { class: 'section-h', text: 'Steepest drop-off, by industry' }));
  host.append(
    el('p', { class: 'view-sub' }, [
      'The gap between women’s overall share and their share of the ',
      withGlossary('top pay quartile', 'upper quartile'),
      '. A big drop means women are present but rarely in the highest-paid roles.',
    ]),
  );

  const rows = s.dataset.meta.divisions
    .map((name, div) => {
      const es = emps.filter((e) => e.div === div);
      const ov = median(es.map((e) => e.w[0]));
      const up = median(es.map((e) => e.w[1]));
      return { name, count: es.length, overall: ov, upper: up, drop: ov !== null && up !== null ? ov - up : null };
    })
    .filter((r) => r.drop !== null && r.count >= 10)
    .sort((a, b) => (b.drop ?? 0) - (a.drop ?? 0));

  const maxDrop = Math.max(0.05, ...rows.map((r) => Math.abs(r.drop ?? 0)));
  const list = el('div', { class: 'drop-list' });
  for (const r of rows) {
    const rowEl = el('div', { class: 'drop-row' });
    rowEl.append(el('div', { class: 'drop-name', text: r.name }));
    const track = el('div', { class: 'drop-track' });
    const fill = el('div', { class: 'drop-fill' });
    fill.style.width = `${(Math.abs(r.drop ?? 0) / maxDrop) * 100}%`;
    if ((r.drop ?? 0) < 0) fill.classList.add('neg');
    track.append(fill);
    rowEl.append(track);
    rowEl.append(
      el('div', { class: 'drop-val', text: `${fmtPct(r.overall, 0)} → ${fmtPct(r.upper, 0)}` }),
    );
    list.append(rowEl);
  }
  host.append(list);
}
