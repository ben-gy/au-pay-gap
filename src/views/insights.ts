// Insights: auto-generated findings plus a correlation scatter (share of women
// in the top quartile vs the gap).

import type { Store } from '../state.ts';
import { el, clear, svgEl } from '../dom.ts';
import { fmtGap, fmtPct } from '../format.ts';
import { buildInsights, scatterPoints } from '../analysis.ts';
import { gapColor } from '../gpg.ts';
import { metricProse } from '../types.ts';
import { hoverTip, scaleLinear } from '../charts.ts';
import { viewHeader } from './industries.ts';

export function renderInsights(host: HTMLElement, store: Store): void {
  clear(host);
  const s = store.get();

  host.append(
    viewHeader(
      'Insights',
      'Findings generated automatically from the current metric. They update when you change the metric in the header.',
    ),
  );

  const insights = buildInsights(s.dataset.employers, s.dataset.meta, s.metric);
  const cards = el('div', { class: 'insight-cards' });
  for (const ins of insights) {
    const card = el('div', { class: `insight-card sev-${ins.severity}` });
    card.append(el('div', { class: 'insight-title', text: ins.title }));
    card.append(el('div', { class: 'insight-body', text: ins.body }));
    cards.append(card);
  }
  host.append(cards);

  // Scatter: upper-quartile women vs gap
  host.append(el('h3', { class: 'section-h', text: 'Fewer women at the top, wider the gap' }));
  host.append(
    el('p', { class: 'view-sub' }, [
      `Each dot is an employer: the share of women in its best-paid quartile (horizontal) against its ${metricProse(s.metric)} gap (vertical). The downward cloud shows the relationship — where women hold more top-quartile roles, the gap shrinks.`,
    ]),
  );

  const pts = scatterPoints(s.dataset.employers, s.metric).filter((p) => p.y >= -0.4 && p.y <= 0.7);
  const W = 900;
  const H = 460;
  const padL = 54;
  const padB = 48;
  const padT = 14;
  const plotW = W - padL - 16;
  const plotH = H - padB - padT;
  const yMin = -0.4;
  const yMax = 0.7;

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'scatter-svg', preserveAspectRatio: 'xMidYMid meet' });

  // Gridlines + Y axis (gap)
  for (let g = yMin; g <= yMax + 1e-9; g += 0.1) {
    const y = padT + plotH - scaleLinear(g, yMin, yMax, plotH);
    svg.append(svgEl('line', { x1: padL, y1: y, x2: W - 16, y2: y, stroke: g === 0 ? 'var(--text-tertiary)' : 'var(--border-subtle)', 'stroke-width': g === 0 ? 1.5 : 1 }));
    const t = svgEl('text', { x: padL - 8, y: y + 4, 'text-anchor': 'end', class: 'axis-text' });
    t.textContent = fmtGap(g, 0);
    svg.append(t);
  }
  // X axis (women %)
  for (let x = 0; x <= 1.0001; x += 0.2) {
    const px = padL + scaleLinear(x, 0, 1, plotW);
    svg.append(svgEl('line', { x1: px, y1: padT, x2: px, y2: padT + plotH, stroke: 'var(--border-subtle)', 'stroke-width': 1 }));
    const t = svgEl('text', { x: px, y: H - padB + 18, 'text-anchor': 'middle', class: 'axis-text' });
    t.textContent = `${Math.round(x * 100)}%`;
    svg.append(t);
  }

  // Points
  for (const p of pts) {
    const cx = padL + scaleLinear(p.x, 0, 1, plotW);
    const cy = padT + plotH - scaleLinear(p.y, yMin, yMax, plotH);
    const dot = svgEl('circle', { cx, cy, r: 2.2, fill: gapColor(p.y), 'fill-opacity': 0.5 });
    dot.classList.add('scatter-dot');
    hoverTip(dot, () => `<b>${p.e.n}</b><br>Top-quartile women: ${fmtPct(p.x, 0)}<br>Gap: ${fmtGap(p.y)}`);
    dot.addEventListener('click', () => store.select(p.e.abn));
    svg.append(dot);
  }

  // Axis titles
  const xl = svgEl('text', { x: padL + plotW / 2, y: H - 4, 'text-anchor': 'middle', class: 'axis-title' });
  xl.textContent = 'Share of women in the top pay quartile →';
  svg.append(xl);
  const yl = svgEl('text', { x: 14, y: padT + plotH / 2, 'text-anchor': 'middle', class: 'axis-title', transform: `rotate(-90 14 ${padT + plotH / 2})` });
  yl.textContent = 'Gender pay gap →';
  svg.append(yl);

  host.append(el('div', { class: 'chart-card' }, [svg as unknown as HTMLElement]));
  host.append(
    el('p', { class: 'view-footnote', text: `${pts.length.toLocaleString('en-AU')} employers plotted (a few extreme outliers are clipped to keep the chart readable). Click any dot for that employer’s detail.` }),
  );
}
