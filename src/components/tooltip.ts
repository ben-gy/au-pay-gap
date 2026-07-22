// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Global glossary tooltip. A single fixed-position popover is shown when the
// user clicks any element carrying a data-term attribute. Click away or Escape
// to dismiss.

import { lookup } from '../glossary.ts';
import { el, clear } from '../dom.ts';

let tip: HTMLDivElement | null = null;

function ensureTip(): HTMLDivElement {
  if (tip) return tip;
  tip = el('div', { class: 'gloss-tip', role: 'dialog' }) as HTMLDivElement;
  tip.hidden = true;
  document.body.append(tip);
  return tip;
}

function hide(): void {
  if (tip) tip.hidden = true;
}

function show(target: HTMLElement, term: string): void {
  const entry = lookup(term);
  if (!entry) return;
  const t = ensureTip();
  clear(t);
  t.append(el('div', { class: 'gloss-tip-term', text: entry.term }));
  t.append(el('div', { class: 'gloss-tip-def', text: entry.definition }));
  t.hidden = false;

  // Position below the target, clamped to the viewport.
  const r = target.getBoundingClientRect();
  const tw = Math.min(320, window.innerWidth - 24);
  t.style.width = `${tw}px`;
  let left = r.left;
  if (left + tw > window.innerWidth - 12) left = window.innerWidth - tw - 12;
  if (left < 12) left = 12;
  let top = r.bottom + 8;
  const th = t.getBoundingClientRect().height;
  if (top + th > window.innerHeight - 12) top = Math.max(12, r.top - th - 8);
  t.style.left = `${left}px`;
  t.style.top = `${top}px`;
}

/** Install the single delegated handler. Call once at startup. */
export function installTooltips(): void {
  ensureTip();
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const link = target.closest('[data-term]') as HTMLElement | null;
    if (link) {
      e.preventDefault();
      e.stopPropagation();
      show(link, link.getAttribute('data-term') || '');
      return;
    }
    if (tip && !tip.hidden && !target.closest('.gloss-tip')) hide();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hide();
  });
  window.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
}
