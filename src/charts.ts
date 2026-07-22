// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Shared charting helpers: a hover value-tooltip used by all SVG views, plus a
// couple of small utilities. Kept separate from the glossary tooltip.

import { el } from './dom.ts';

let chartTip: HTMLDivElement | null = null;

function ensure(): HTMLDivElement {
  if (chartTip) return chartTip;
  chartTip = el('div', { class: 'chart-tip' }) as HTMLDivElement;
  chartTip.hidden = true;
  document.body.append(chartTip);
  return chartTip;
}

export function showChartTip(html: string, x: number, y: number): void {
  const t = ensure();
  t.innerHTML = html;
  t.hidden = false;
  const w = t.getBoundingClientRect().width;
  let left = x + 14;
  if (left + w > window.innerWidth - 8) left = x - w - 14;
  t.style.left = `${Math.max(8, left)}px`;
  t.style.top = `${y + 14}px`;
}

export function hideChartTip(): void {
  if (chartTip) chartTip.hidden = true;
}

/** Attach hover tooltip behaviour to an SVG element. */
export function hoverTip(node: Element, htmlFn: () => string): void {
  node.addEventListener('mousemove', (e) => {
    const me = e as MouseEvent;
    showChartTip(htmlFn(), me.clientX, me.clientY);
  });
  node.addEventListener('mouseleave', hideChartTip);
}

/** Map a value in [min,max] to a pixel position in [0,length]. */
export function scaleLinear(v: number, min: number, max: number, length: number): number {
  if (max === min) return 0;
  return ((v - min) / (max - min)) * length;
}
