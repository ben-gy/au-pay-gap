// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Application entry point: load data, build the shell, wire the store to the
// views, and render.

import './styles.css';
import { loadDataset } from './data.ts';
import { Store, type ViewId } from './state.ts';
import type { Dataset } from './types.ts';
import { METRICS } from './types.ts';
import { el, clear, debounce } from './dom.ts';
import { fmtNumber, fmtGap } from './format.ts';
import { median } from './analysis.ts';
import { gapColor } from './gpg.ts';
import { installTooltips } from './components/tooltip.ts';
import { openAbout } from './components/about.ts';
import { renderDetail } from './components/detail.ts';
import { renderExplorer } from './views/explorer.ts';
import { renderIndustries } from './views/industries.ts';
import { renderPyramid } from './views/pyramid.ts';
import { renderDistribution } from './views/distribution.ts';
import { renderMatrix } from './views/matrix.ts';
import { renderMovers } from './views/movers.ts';
import { renderInsights } from './views/insights.ts';

const TABS: { id: ViewId; label: string }[] = [
  { id: 'explorer', label: 'Explorer' },
  { id: 'industries', label: 'Industries' },
  { id: 'pyramid', label: 'Glass Pyramid' },
  { id: 'distribution', label: 'Distribution' },
  { id: 'matrix', label: 'Matrix' },
  { id: 'movers', label: 'Movers' },
  { id: 'insights', label: 'Insights' },
];

const VIEW_RENDERERS: Record<ViewId, (host: HTMLElement, store: Store) => void> = {
  explorer: renderExplorer,
  industries: renderIndustries,
  pyramid: renderPyramid,
  distribution: renderDistribution,
  matrix: renderMatrix,
  movers: renderMovers,
  insights: renderInsights,
};

function boot(): void {
  const app = document.getElementById('app')!;
  clear(app);
  app.append(loadingShell());

  const controller = new AbortController();
  loadDataset(controller.signal)
    .then((dataset) => {
      mountApp(app, dataset);
    })
    .catch((err) => {
      renderError(app, err);
    });
}

function loadingShell(): HTMLElement {
  const wrap = el('div', { class: 'loading-wrap' });
  wrap.append(el('div', { class: 'spinner' }));
  wrap.append(el('div', { class: 'loading-text', text: 'Loading gender pay gap data…' }));
  return wrap;
}

function renderError(app: HTMLElement, err: unknown): void {
  clear(app);
  const wrap = el('div', { class: 'error-wrap' });
  wrap.append(el('div', { class: 'error-icon', text: '⚠️' }));
  wrap.append(el('h1', { text: 'Couldn’t load the data' }));
  wrap.append(el('p', { text: String((err as Error)?.message || err) }));
  const retry = el('button', { class: 'retry-btn', type: 'button' }, ['Try again']);
  retry.addEventListener('click', () => boot());
  wrap.append(retry);
  app.append(wrap);
}

function mountApp(app: HTMLElement, dataset: Dataset): void {
  clear(app);
  installTooltips();
  const store = new Store(dataset);

  // ---- Header ----
  const header = el('header', { class: 'app-header' });
  const brand = el('div', { class: 'brand' });
  brand.append(el('img', { src: '/favicon.svg', class: 'brand-logo', alt: '' }));
  const brandText = el('div', { class: 'brand-text' });
  brandText.append(el('span', { class: 'brand-title', text: 'Gender Pay Gap' }));
  brandText.append(el('span', { class: 'brand-badge', text: 'AU' }));
  brand.append(brandText);
  header.append(brand);

  const controls = el('div', { class: 'header-controls' });

  // Search
  const searchWrap = el('div', { class: 'search-wrap' });
  const search = el('input', {
    class: 'search-input',
    type: 'search',
    placeholder: 'Search 8,600+ employers…',
    'aria-label': 'Search employers',
  }) as HTMLInputElement;
  const doSearch = debounce((v: string) => store.patchFilters({ search: v }), 250);
  search.addEventListener('input', () => {
    doSearch(search.value);
    if (store.get().view !== 'explorer') store.set({ view: 'explorer' });
  });
  searchWrap.append(el('span', { class: 'search-icon', text: '🔍' }), search);
  controls.append(searchWrap);

  // Metric select
  const metricSel = el('select', { class: 'metric-select', 'aria-label': 'Choose measure' }) as HTMLSelectElement;
  METRICS.forEach((m) => {
    const opt = el('option', { value: m.key, text: m.label }) as HTMLOptionElement;
    if (m.key === store.get().metric) opt.selected = true;
    metricSel.append(opt);
  });
  metricSel.addEventListener('change', () => store.set({ metric: metricSel.value as any, page: 0 }));
  controls.append(metricSel);

  // About
  const about = el('button', { class: 'about-btn', type: 'button', 'aria-label': 'About this site' }, ['?']);
  about.addEventListener('click', () => openAbout(dataset.meta));
  controls.append(about);

  header.append(controls);

  // ---- National strip ----
  const strip = el('div', { class: 'national-strip' });

  // ---- Tabs ----
  const tabsNav = el('nav', { class: 'view-tabs', 'aria-label': 'Views' });
  const tabButtons = new Map<ViewId, HTMLButtonElement>();
  for (const t of TABS) {
    const b = el('button', { class: 'view-tab', type: 'button', 'data-view': t.id }, [t.label]) as HTMLButtonElement;
    b.addEventListener('click', () => store.set({ view: t.id }));
    tabButtons.set(t.id, b);
    tabsNav.append(b);
  }

  // ---- Main + detail + footer ----
  const main = el('main', { class: 'main-content' });
  const viewHost = el('div', { class: 'view-container' });
  main.append(viewHost);
  const detailHost = el('aside', { class: 'detail-host' });
  const scrim = el('div', { class: 'detail-scrim' });
  scrim.addEventListener('click', () => store.select(null));

  const footer = buildFooter(dataset);

  app.append(header, strip, tabsNav, main, scrim, detailHost, footer);

  // ---- Render loop ----
  function render(): void {
    const s = store.get();
    for (const [id, btn] of tabButtons) btn.classList.toggle('active', id === s.view);
    renderStrip(strip, s);
    clear(viewHost);
    VIEW_RENDERERS[s.view](viewHost, store);
    renderDetail(detailHost, store);
    scrim.classList.toggle('open', !!s.selected);
    document.body.classList.toggle('detail-open', !!s.selected);
  }
  store.subscribe(render);
  render();
}

function renderStrip(strip: HTMLElement, s: ReturnType<Store['get']>): void {
  clear(strip);
  const emps = s.dataset.employers;
  const med = median(emps.map((e) => e[s.metric]));
  const favMen = emps.filter((e) => e[s.metric] !== null && (e[s.metric] as number) > 0.05).length;
  const inTarget = s.dataset.meta.counts.inTargetZone;
  const total = emps.length;

  const items: [string, HTMLElement | string, string?][] = [
    ['Typical employer gap', gapSpan(med), 'median of the selected measure'],
    ['Pay men more', `${Math.round((favMen / total) * 100)}%`, `${fmtNumber(favMen)} of ${fmtNumber(total)} employers`],
    ['In the ±5% target zone', `${Math.round((inTarget / total) * 100)}%`, `${fmtNumber(inTarget)} employers`],
    ['Reporting year', s.dataset.meta.reportingYear, `${fmtNumber(total)} employers`],
  ];
  for (const [label, value, note] of items) {
    const item = el('div', { class: 'strip-item' });
    item.append(el('div', { class: 'strip-value' }, [typeof value === 'string' ? value : value]));
    item.append(el('div', { class: 'strip-label', text: label }));
    if (note) item.append(el('div', { class: 'strip-note', text: note }));
    strip.append(item);
  }
}

function gapSpan(v: number | null): HTMLElement {
  const s = el('span', { text: fmtGap(v) });
  s.style.color = gapColor(v);
  return s;
}

function buildFooter(dataset: Dataset): HTMLElement {
  const footer = el('footer', { class: 'site-footer' });
  const inner = el('div', { class: 'footer-inner' });

  const left = el('div', { class: 'footer-left' });
  const src = el('p', { class: 'footer-source' });
  src.append('Data: ');
  src.append(el('a', { href: dataset.meta.sourceUrl, target: '_blank', rel: 'noopener', text: 'Workplace Gender Equality Agency (WGEA)' }));
  src.append(` · ${dataset.meta.reportingYear} reporting year · ${fmtNumber(dataset.meta.counts.employers)} employers.`);
  left.append(src);
  left.append(
    el('p', { class: 'footer-note', text: 'An independent tool, not affiliated with WGEA or the Australian Government. A gender pay gap is not the same as unequal pay for equal work.' }),
  );
  inner.append(left);

  const credit = el('div', { class: 'footer-credit' });
  credit.append('Built by ');
  credit.append(el('a', { href: 'https://benrichardson.dev/', target: '_blank', rel: 'noopener', text: 'benrichardson.dev' }));
  credit.append(' · ');
  credit.append(el('a', { href: 'https://hub.benrichardson.dev', target: '_blank', rel: 'noopener', text: 'more tools & sites' }));
  inner.append(credit);

  footer.append(inner);
  return footer;
}

boot();
