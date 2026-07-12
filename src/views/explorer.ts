// Explorer: the core sortable, filterable table of every employer / group.

import type { Store } from '../state.ts';
import type { Employer, Entity } from '../types.ts';
import { el, clear, withGlossary } from '../dom.ts';
import { fmtGap, fmtPct, fmtMoney, fmtPointsChange, fmtNumber } from '../format.ts';
import { gapColor, gapClass } from '../gpg.ts';
import {
  filterEmployers,
  filterGroups,
  sortEntities,
  priorKeyFor,
  type SortKey,
} from '../analysis.ts';

const PAGE_SIZE = 50;

function chip(label: string, active: boolean, onClick: () => void): HTMLElement {
  const b = el('button', { class: `chip${active ? ' active' : ''}`, type: 'button' }, [label]);
  b.addEventListener('click', onClick);
  return b;
}

function toggleInSet(set: Set<number>, v: number): Set<number> {
  const next = new Set(set);
  if (next.has(v)) next.delete(v);
  else next.add(v);
  return next;
}

function filterBar(store: Store): HTMLElement {
  const s = store.get();
  const meta = s.dataset.meta;
  const f = s.filters;
  const bar = el('div', { class: 'filter-bar' });

  // Direction
  const dirGroup = el('div', { class: 'filter-group' });
  dirGroup.append(el('span', { class: 'filter-label', text: 'Gap direction' }));
  const dirs: [string, typeof f.direction][] = [
    ['All', 'all'],
    ['Favours men', 'men'],
    ['Target zone', 'target'],
    ['Favours women', 'women'],
  ];
  for (const [label, val] of dirs) {
    dirGroup.append(chip(label, f.direction === val, () => store.patchFilters({ direction: val })));
  }
  bar.append(dirGroup);

  // Sector
  const secGroup = el('div', { class: 'filter-group' });
  secGroup.append(el('span', { class: 'filter-label', text: 'Sector' }));
  meta.sectors.forEach((name, i) =>
    secGroup.append(chip(name, f.sectors.has(i), () => store.patchFilters({ sectors: toggleInSet(f.sectors, i) }))),
  );
  bar.append(secGroup);

  // Size
  const sizeGroup = el('div', { class: 'filter-group' });
  sizeGroup.append(el('span', { class: 'filter-label', text: 'Size' }));
  meta.sizes.forEach((name, i) =>
    sizeGroup.append(chip(name, f.sizes.has(i), () => store.patchFilters({ sizes: toggleInSet(f.sizes, i) }))),
  );
  bar.append(sizeGroup);

  // Industry (employers mode only)
  if (s.mode === 'employers') {
    const indGroup = el('div', { class: 'filter-group filter-group-wide' });
    indGroup.append(el('span', { class: 'filter-label', text: 'Industry' }));
    const sel = el('select', { class: 'industry-select', 'aria-label': 'Filter by industry' }) as HTMLSelectElement;
    sel.append(el('option', { value: '', text: 'All industries' }));
    meta.divisions.forEach((name, i) => {
      const opt = el('option', { value: String(i), text: name }) as HTMLOptionElement;
      if (f.divisions.has(i)) opt.selected = true;
      sel.append(opt);
    });
    sel.addEventListener('change', () => {
      const v = sel.value;
      store.patchFilters({ divisions: v === '' ? new Set() : new Set([Number(v)]) });
    });
    indGroup.append(sel);
    bar.append(indGroup);
  }

  // Reset
  const hasFilters =
    f.direction !== 'all' || f.sectors.size || f.sizes.size || f.divisions.size || f.search;
  if (hasFilters) {
    const reset = el('button', { class: 'reset-btn', type: 'button' }, ['Clear filters']);
    reset.addEventListener('click', () =>
      store.patchFilters({ direction: 'all', sectors: new Set(), sizes: new Set(), divisions: new Set(), search: '' }),
    );
    bar.append(reset);
  }

  return bar;
}

function headerCell(store: Store, label: string | HTMLElement, key: SortKey | null, extraClass = ''): HTMLElement {
  const s = store.get();
  const th = el('th', { class: `${extraClass}${key ? ' sortable' : ''}`, scope: 'col' });
  const active = key && s.sortKey === key;
  if (typeof label === 'string') th.append(label);
  else th.append(label);
  if (key) {
    th.append(el('span', { class: 'sort-ind', text: active ? (s.sortDir === 'asc' ? ' ▲' : ' ▼') : '' }));
    th.addEventListener('click', () => {
      if (s.sortKey === key) store.set({ sortDir: s.sortDir === 'asc' ? 'desc' : 'asc' });
      else store.set({ sortKey: key, sortDir: key === 'name' ? 'asc' : 'desc' });
    });
  }
  return th;
}

function row(store: Store, e: Entity, rank: number): HTMLElement {
  const s = store.get();
  const isEmp = s.mode === 'employers';
  const tr = el('tr', { class: 'data-row', tabindex: '0', role: 'button' });
  const gap = e[s.metric];
  const prior = e[priorKeyFor(s.metric)];
  const change = gap !== null && prior !== null ? gap - prior : null;

  tr.append(el('td', { class: 'c-rank', text: String(rank) }));

  const nameCell = el('td', { class: 'c-name' });
  nameCell.append(el('span', { class: 'row-name', text: e.n }));
  tr.append(nameCell);

  if (isEmp) {
    const div = (e as Employer).div;
    tr.append(el('td', { class: 'c-industry', text: div >= 0 ? s.dataset.meta.divisions[div] : '—' }));
  }
  tr.append(el('td', { class: 'c-size', text: s.dataset.meta.sizes[e.sz] }));

  const gapCell = el('td', { class: 'c-gap' });
  const pill = el('span', { class: `gap-pill gap-${gapClass(gap)}`, text: fmtGap(gap) });
  pill.style.color = gapColor(gap);
  gapCell.append(pill);
  tr.append(gapCell);

  const chCell = el('td', { class: 'c-change' });
  if (change !== null) {
    const good = change < 0;
    chCell.append(
      el('span', { class: `change ${good ? 'good' : change > 0 ? 'bad' : 'flat'}`, text: `${change < 0 ? '▼' : change > 0 ? '▲' : '■'} ${fmtPointsChange(change)}` }),
    );
  } else {
    chCell.append(el('span', { class: 'change flat', text: '—' }));
  }
  tr.append(chCell);

  tr.append(el('td', { class: 'c-women', text: fmtPct(e.w[0], 0) }));
  tr.append(el('td', { class: 'c-pay', text: fmtMoney(e.r[0]) }));

  const id = isEmp ? (e as Employer).abn : e.n;
  const open = () => store.select(id);
  tr.addEventListener('click', open);
  tr.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      open();
    }
  });
  return tr;
}

export function renderExplorer(host: HTMLElement, store: Store): void {
  clear(host);
  const s = store.get();
  const isEmp = s.mode === 'employers';

  // Mode toggle + count
  const top = el('div', { class: 'explorer-top' });
  const modeToggle = el('div', { class: 'seg-toggle', role: 'tablist', 'aria-label': 'Entity type' });
  const empBtn = el('button', { class: `seg${isEmp ? ' active' : ''}`, type: 'button' }, [
    `Employers (${fmtNumber(s.dataset.employers.length)})`,
  ]);
  empBtn.addEventListener('click', () => store.set({ mode: 'employers' }, { resetPage: true }));
  const grpBtn = el('button', { class: `seg${!isEmp ? ' active' : ''}`, type: 'button' }, [
    `Corporate groups (${fmtNumber(s.dataset.groups.length)})`,
  ]);
  grpBtn.addEventListener('click', () => store.set({ mode: 'groups' }, { resetPage: true }));
  modeToggle.append(empBtn, grpBtn);
  top.append(modeToggle);
  host.append(top);

  host.append(filterBar(store));

  // Compute list
  const base: Entity[] = isEmp
    ? filterEmployers(s.dataset.employers, s.filters, s.metric)
    : filterGroups(s.dataset.groups, s.filters, s.metric);
  const sorted = sortEntities(base, s.sortKey, s.sortDir, s.metric);

  const countLine = el('div', { class: 'result-count' });
  countLine.append(el('strong', { text: fmtNumber(sorted.length) }));
  countLine.append(` ${isEmp ? 'employers' : 'groups'} match — sorted by ${sortLabel(s.sortKey)}`);
  host.append(countLine);

  if (!sorted.length) {
    host.append(
      el('div', { class: 'empty-state' }, [
        el('div', { class: 'empty-icon', text: '🔍' }),
        el('div', { text: 'No employers match these filters.' }),
        el('div', { class: 'empty-sub', text: 'Try clearing a filter or changing your search.' }),
      ]),
    );
    return;
  }

  // Table
  const wrap = el('div', { class: 'table-wrap' });
  const table = el('table', { class: 'data-table' });
  const thead = el('thead');
  const htr = el('tr');
  htr.append(headerCell(store, '#', null, 'c-rank'));
  htr.append(headerCell(store, 'Employer', 'name', 'c-name'));
  if (isEmp) htr.append(headerCell(store, withGlossary('Industry', 'anzsic'), null, 'c-industry'));
  htr.append(headerCell(store, 'Size', null, 'c-size'));
  htr.append(headerCell(store, withGlossary('Gap', 'gender pay gap'), 'gap', 'c-gap'));
  htr.append(headerCell(store, withGlossary('YoY', 'year-on-year'), 'change', 'c-change'));
  htr.append(headerCell(store, '% women', 'women', 'c-women'));
  htr.append(headerCell(store, 'Avg pay', 'pay', 'c-pay'));
  thead.append(htr);
  table.append(thead);

  const tbody = el('tbody');
  const start = s.page * PAGE_SIZE;
  const pageRows = sorted.slice(start, start + PAGE_SIZE);
  pageRows.forEach((e, i) => tbody.append(row(store, e, start + i + 1)));
  table.append(tbody);
  wrap.append(table);
  host.append(wrap);

  // Pagination
  const pages = Math.ceil(sorted.length / PAGE_SIZE);
  if (pages > 1) {
    const pag = el('div', { class: 'pagination' });
    const prev = el('button', { class: 'page-btn', type: 'button', disabled: s.page === 0 }, ['‹ Prev']);
    prev.addEventListener('click', () => store.set({ page: Math.max(0, s.page - 1) }));
    const next = el('button', { class: 'page-btn', type: 'button', disabled: s.page >= pages - 1 }, ['Next ›']);
    next.addEventListener('click', () => store.set({ page: Math.min(pages - 1, s.page + 1) }));
    pag.append(prev);
    pag.append(el('span', { class: 'page-info', text: `Page ${s.page + 1} of ${fmtNumber(pages)}` }));
    pag.append(next);
    host.append(pag);
  }
}

function sortLabel(key: SortKey): string {
  switch (key) {
    case 'name':
      return 'name';
    case 'gap':
      return 'gap (signed)';
    case 'abs':
      return 'gap size';
    case 'women':
      return '% women';
    case 'change':
      return 'year-on-year change';
    case 'pay':
      return 'average pay';
  }
}
