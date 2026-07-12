// Movers: biggest year-on-year improvers and deteriorations vs the prior year.

import type { Store } from '../state.ts';
import type { Employer, Entity } from '../types.ts';
import { el, clear } from '../dom.ts';
import { fmtGap, fmtPointsChange } from '../format.ts';
import { movers, type Mover } from '../analysis.ts';
import { metricProse } from '../types.ts';
import { viewHeader } from './industries.ts';

const TOP_N = 20;

function moverRow(store: Store, m: Mover, mode: string): HTMLElement {
  const rowEl = el('button', { class: 'mover-row', type: 'button' });
  const id = mode === 'employers' ? (m.entity as Employer).abn : m.entity.n;
  rowEl.addEventListener('click', () => store.select(id));

  const name = el('div', { class: 'mover-name' });
  name.append(el('span', { class: 'mover-name-text', text: m.entity.n }));
  name.append(el('span', { class: 'mover-detail', text: `${fmtGap(m.prior)} → ${fmtGap(m.current)}` }));
  rowEl.append(name);

  const change = el('div', { class: `mover-change ${m.change < 0 ? 'good' : 'bad'}` });
  change.append(el('span', { class: 'mover-arrow', text: m.change < 0 ? '▼' : '▲' }));
  change.append(el('span', { text: fmtPointsChange(m.change) }));
  rowEl.append(change);
  return rowEl;
}

function column(store: Store, title: string, sub: string, list: Mover[], mode: string): HTMLElement {
  const col = el('div', { class: 'mover-col' });
  col.append(el('h3', { class: 'mover-col-title', text: title }));
  col.append(el('p', { class: 'mover-col-sub', text: sub }));
  if (!list.length) {
    col.append(el('p', { class: 'detail-note', text: 'No employers with a year-on-year comparison in this group.' }));
    return col;
  }
  const rows = el('div', { class: 'mover-rows' });
  list.slice(0, TOP_N).forEach((m) => rows.append(moverRow(store, m, mode)));
  col.append(rows);
  return col;
}

export function renderMovers(host: HTMLElement, store: Store): void {
  clear(host);
  const s = store.get();
  const list: Entity[] = s.mode === 'employers' ? s.dataset.employers : s.dataset.groups;
  const metricLabel = metricProse(s.metric);

  host.append(
    viewHeader(
      'Biggest movers',
      `Which ${s.mode} changed their ${metricLabel} gap the most between ${s.dataset.meta.priorYear} and ${s.dataset.meta.reportingYear}? Only those reported in both years appear. Click any name for the full breakdown.`,
    ),
  );

  const { improved, worsened } = movers(list, s.metric);

  // Net summary bar
  const net = el('div', { class: 'mover-summary' });
  net.append(summaryPill('Narrowed the gap', improved.length, 'var(--status-good)'));
  net.append(summaryPill('Widened the gap', worsened.length, 'var(--men)'));
  host.append(net);

  const cols = el('div', { class: 'mover-cols' });
  cols.append(column(store, '↓ Most improved', 'Largest narrowing of the gap', improved, s.mode));
  cols.append(column(store, '↑ Widened most', 'Largest increase in the gap', worsened, s.mode));
  host.append(cols);
}

function summaryPill(label: string, n: number, color: string): HTMLElement {
  const p = el('div', { class: 'summary-pill' });
  const v = el('strong', { text: n.toLocaleString('en-AU') });
  v.style.color = color;
  p.append(v);
  p.append(el('span', { text: ` ${label}` }));
  return p;
}
