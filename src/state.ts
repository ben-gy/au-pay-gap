// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Central application store: current view, metric, filters, sort, selection.
// Persists user preferences to localStorage and reflects selection + view in
// the URL hash for deep-linking.

import type { Dataset, MetricKey } from './types.ts';
import { emptyFilters, type Filters, type SortDir, type SortKey } from './analysis.ts';

export type ViewId =
  | 'explorer'
  | 'industries'
  | 'pyramid'
  | 'distribution'
  | 'matrix'
  | 'movers'
  | 'insights';

export type EntityMode = 'employers' | 'groups';

export interface AppState {
  dataset: Dataset;
  view: ViewId;
  metric: MetricKey;
  mode: EntityMode;
  filters: Filters;
  sortKey: SortKey;
  sortDir: SortDir;
  page: number;
  selected: string | null; // employer ABN (or group name) currently in detail panel
}

const PREF_KEY = 'apg:prefs:v1';
const VIEWS: ViewId[] = ['explorer', 'industries', 'pyramid', 'distribution', 'matrix', 'movers', 'insights'];

interface Prefs {
  view: ViewId;
  metric: MetricKey;
  mode: EntityMode;
  sortKey: SortKey;
  sortDir: SortDir;
}

function loadPrefs(): Partial<Prefs> {
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
  } catch {
    return {};
  }
}

function savePrefs(s: AppState): void {
  try {
    const p: Prefs = { view: s.view, metric: s.metric, mode: s.mode, sortKey: s.sortKey, sortDir: s.sortDir };
    localStorage.setItem(PREF_KEY, JSON.stringify(p));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

type Listener = (s: AppState) => void;

export class Store {
  private state: AppState;
  private listeners = new Set<Listener>();

  constructor(dataset: Dataset) {
    const p = loadPrefs();
    this.state = {
      dataset,
      view: p.view && VIEWS.includes(p.view) ? p.view : 'explorer',
      metric: p.metric || 'mt',
      mode: p.mode || 'employers',
      filters: emptyFilters(),
      sortKey: p.sortKey || 'gap',
      sortDir: p.sortDir || 'desc',
      page: 0,
      selected: null,
    };
    this.applyHash();
    window.addEventListener('hashchange', () => this.applyHash(true));
  }

  get(): AppState {
    return this.state;
  }

  subscribe(fn: Listener): void {
    this.listeners.add(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.state);
  }

  set(patch: Partial<AppState>, opts: { resetPage?: boolean } = {}): void {
    this.state = { ...this.state, ...patch };
    if (opts.resetPage) this.state.page = 0;
    savePrefs(this.state);
    this.syncHash();
    this.emit();
  }

  /** Update filters immutably. */
  patchFilters(patch: Partial<Filters>): void {
    this.state = { ...this.state, filters: { ...this.state.filters, ...patch }, page: 0 };
    this.syncHash();
    this.emit();
  }

  select(id: string | null): void {
    this.state = { ...this.state, selected: id };
    this.syncHash();
    this.emit();
  }

  private syncHash(): void {
    const parts: string[] = [`view=${this.state.view}`];
    if (this.state.selected) parts.push(`sel=${encodeURIComponent(this.state.selected)}`);
    const hash = `#${parts.join('&')}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
  }

  private applyHash(emit = false): void {
    const h = location.hash.replace(/^#/, '');
    if (!h) return;
    const params = new URLSearchParams(h.replace(/&/g, '&'));
    const view = params.get('view') as ViewId | null;
    const sel = params.get('sel');
    let changed = false;
    if (view && VIEWS.includes(view) && view !== this.state.view) {
      this.state = { ...this.state, view };
      changed = true;
    }
    const decodedSel = sel ? decodeURIComponent(sel) : null;
    if (decodedSel !== this.state.selected) {
      this.state = { ...this.state, selected: decodedSel };
      changed = true;
    }
    if (emit && changed) this.emit();
  }
}
