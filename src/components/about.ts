// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// About / methodology modal, opened from the header "?" button.

import { el, clear } from '../dom.ts';
import type { Meta } from '../types.ts';

let overlay: HTMLDivElement | null = null;

function para(text: string): HTMLElement {
  return el('p', {}, [text]);
}

export function openAbout(meta: Meta): void {
  if (!overlay) {
    overlay = el('div', { class: 'modal-overlay' }) as HTMLDivElement;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAbout();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAbout();
    });
    document.body.append(overlay);
  }
  clear(overlay);

  const card = el('div', { class: 'modal-card', role: 'dialog', 'aria-label': 'About this site' });
  const head = el('div', { class: 'modal-head' }, [
    el('h2', { text: 'About Gender Pay Gap (AU)' }),
    el('button', { class: 'modal-close', 'aria-label': 'Close', type: 'button' }, ['×']),
  ]);
  head.querySelector('button')!.addEventListener('click', closeAbout);

  const body = el('div', { class: 'modal-body' });
  body.append(
    para(
      'This site makes the Workplace Gender Equality Agency (WGEA) employer gender pay gaps searchable and comparable in one place. WGEA publishes these figures once a year inside a one-employer-at-a-time explorer; here you can rank every employer, compare against industry and national benchmarks, and see year-on-year movement.',
    ),
  );
  body.append(el('h3', { text: 'What the data is' }));
  body.append(
    para(
      `Every Australian employer with 100 or more employees must report to WGEA each year. This release covers the ${meta.reportingYear} reporting year and, where available, ${meta.priorYear} for comparison. It includes ${meta.counts.employers.toLocaleString('en-AU')} individual employers plus corporate groups.`,
    ),
  );
  body.append(el('h3', { text: 'How to read a gap' }));
  body.append(
    para(
      'A positive gap means men are paid more; a negative gap means women are paid more. WGEA treats −5% to +5% as the “target zone”. Importantly, a gender pay gap is not the same as unequal pay for the same work — it mostly reflects how women and men are distributed across roles, seniority and industries. Employers are not permitted to pay people differently for the same job.',
    ),
  );
  body.append(el('h3', { text: 'Median vs average, base vs total' }));
  body.append(
    para(
      'You can switch the metric between median and average, and between base salary and total remuneration (which adds super, overtime and bonuses). The average is usually larger because a few very high earners — more often men — pull it up. All figures are annualised to a full-time-equivalent basis.',
    ),
  );
  body.append(el('h3', { text: 'Caveats' }));
  body.append(
    para(
      'Figures are self-reported by employers and rounded. Small employers can show large or volatile gaps because a single senior hire moves the numbers. An employer may report under a legal name that differs from its trading name. This is an independent tool and is not affiliated with WGEA or the Australian Government.',
    ),
  );
  body.append(el('h3', { text: 'Source & updates' }));
  const src = el('p');
  src.append('Data: ');
  src.append(el('a', { href: meta.sourceUrl, target: '_blank', rel: 'noopener', text: 'WGEA Data Explorer' }));
  src.append(`. Generated ${new Date(meta.generatedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}. The dataset refreshes automatically when WGEA publishes new figures (annually, in March).`);
  body.append(src);

  card.append(head, body);
  overlay.append(card);
  overlay.hidden = false;
  (card.querySelector('.modal-close') as HTMLElement)?.focus();
}

export function closeAbout(): void {
  if (overlay) overlay.hidden = true;
}
