// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Distribution: histogram of employer gaps, with the ±5% target zone marked.

import type { Store } from '../state.ts';
import { el, clear, svgEl } from '../dom.ts';
import { fmtGap, fmtNumber } from '../format.ts';
import { histogram } from '../analysis.ts';
import { gapColor } from '../gpg.ts';
import { metricProse } from '../types.ts';
import { hoverTip } from '../charts.ts';
import { viewHeader } from './industries.ts';

export function renderDistribution(host: HTMLElement, store: Store): void {
  clear(host);
  const s = store.get();
  const list = s.mode === 'employers' ? s.dataset.employers : s.dataset.groups;
  const values = list.map((e) => e[s.metric]);
  const bins = histogram(values, 0.05, -0.3, 0.6);
  const maxCount = Math.max(1, ...bins.map((b) => b.count));
  const total = values.filter((v) => v !== null).length;

  host.append(
    viewHeader(
      'Distribution of gaps',
      `How ${fmtNumber(total)} ${s.mode} are spread across the range of the ${metricProse(s.metric)} gap. The green band is WGEA’s ±5% target zone; bars to its right favour men, to its left favour women.`,
    ),
  );

  // Summary stats row
  const favMen = values.filter((v) => v !== null && (v as number) > 0.05).length;
  const favWomen = values.filter((v) => v !== null && (v as number) < -0.05).length;
  const inTarget = total - favMen - favWomen;
  const stats = el('div', { class: 'dist-stats' });
  stats.append(statCard('Favour men', favMen, total, 'var(--men)'));
  stats.append(statCard('In target zone', inTarget, total, 'var(--status-good)'));
  stats.append(statCard('Favour women', favWomen, total, 'var(--women)'));
  host.append(stats);

  // Histogram SVG
  const W = 900;
  const H = 360;
  const padL = 46;
  const padB = 46;
  const padT = 12;
  const plotW = W - padL - 12;
  const plotH = H - padB - padT;
  const bw = plotW / bins.length;

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'dist-svg', preserveAspectRatio: 'xMidYMid meet' });

  // Target zone band
  const targetBins = bins.filter((b) => b.inTarget);
  if (targetBins.length) {
    const firstIdx = bins.indexOf(targetBins[0]);
    const bandX = padL + firstIdx * bw;
    svg.append(
      svgEl('rect', {
        x: bandX,
        y: padT,
        width: bw * targetBins.length,
        height: plotH,
        fill: 'rgba(22,163,74,0.10)',
      }),
    );
  }

  // Y gridlines
  const yticks = 4;
  for (let i = 0; i <= yticks; i++) {
    const val = Math.round((maxCount / yticks) * i);
    const y = padT + plotH - (plotH / yticks) * i;
    svg.append(svgEl('line', { x1: padL, y1: y, x2: W - 12, y2: y, stroke: 'var(--border-subtle)', 'stroke-width': 1 }));
    const t = svgEl('text', { x: padL - 8, y: y + 4, 'text-anchor': 'end', class: 'axis-text' });
    t.textContent = fmtNumber(val);
    svg.append(t);
  }

  // Bars
  bins.forEach((b, i) => {
    const mid = (b.lo + b.hi) / 2;
    const h = (b.count / maxCount) * plotH;
    const x = padL + i * bw;
    const y = padT + plotH - h;
    const rect = svgEl('rect', {
      x: x + 1,
      y,
      width: Math.max(1, bw - 2),
      height: h,
      rx: 2,
      fill: b.inTarget ? 'var(--status-good)' : gapColor(mid),
    });
    rect.classList.add('dist-bar');
    hoverTip(
      rect,
      () =>
        `<b>${fmtGap(b.lo)} to ${fmtGap(b.hi)}</b><br>${fmtNumber(b.count)} ${s.mode} (${((b.count / total) * 100).toFixed(1)}%)`,
    );
    svg.append(rect);

    // X labels every other bin
    if (i % 2 === 0) {
      const t = svgEl('text', { x: x + bw / 2, y: H - padB + 18, 'text-anchor': 'middle', class: 'axis-text' });
      t.textContent = fmtGap(b.lo, 0);
      svg.append(t);
    }
  });

  // Zero line
  const zeroIdx = bins.findIndex((b) => b.lo <= 0 && b.hi > 0);
  if (zeroIdx >= 0) {
    const zx = padL + zeroIdx * bw + ((0 - bins[zeroIdx].lo) / 0.05) * bw;
    svg.append(svgEl('line', { x1: zx, y1: padT, x2: zx, y2: padT + plotH, stroke: 'var(--text-tertiary)', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }));
  }

  // Axis labels
  const xl = svgEl('text', { x: padL + plotW / 2, y: H - 6, 'text-anchor': 'middle', class: 'axis-title' });
  xl.textContent = 'Gender pay gap (negative favours women · positive favours men)';
  svg.append(xl);

  const chartWrap = el('div', { class: 'chart-card' }, [svg as unknown as HTMLElement]);
  host.append(chartWrap);
}

function statCard(label: string, n: number, total: number, color: string): HTMLElement {
  const c = el('div', { class: 'dist-stat' });
  const v = el('div', { class: 'dist-stat-val', text: fmtNumber(n) });
  v.style.color = color;
  c.append(v);
  c.append(el('div', { class: 'dist-stat-label', text: label }));
  c.append(el('div', { class: 'dist-stat-pct', text: `${((n / Math.max(1, total)) * 100).toFixed(0)}% of total` }));
  return c;
}
