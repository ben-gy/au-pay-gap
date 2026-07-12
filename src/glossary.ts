// Domain glossary. Every jargon term used in the UI has a plain-language
// definition here, surfaced via click-to-show tooltips (see components/tooltip).

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const glossary: Record<string, GlossaryEntry> = {
  'gender pay gap': {
    term: 'Gender pay gap',
    definition:
      'The difference between what women and men are paid across an organisation, expressed as a percentage of men’s pay. A positive gap means men earn more; a negative gap means women earn more. It is NOT the same as unequal pay for the same job — it usually reflects how women and men are spread across roles and seniority.',
  },
  gpg: {
    term: 'GPG',
    definition: 'Short for “gender pay gap”. A positive value favours men; a negative value favours women.',
  },
  median: {
    term: 'Median',
    definition:
      'The middle value: line every employee up by pay and take the person in the exact middle. The median gap compares the middle woman with the middle man, so it is not skewed by a handful of very high earners.',
  },
  average: {
    term: 'Average (mean)',
    definition:
      'Add up all pay and divide by the number of employees. The average gap is pulled higher by a small number of very well-paid people (often men), so it is usually larger than the median gap.',
  },
  'total remuneration': {
    term: 'Total remuneration',
    definition:
      'Everything an employee is paid: base salary plus superannuation, overtime, bonuses, and other additional payments — annualised to a full-time equivalent.',
  },
  'base salary': {
    term: 'Base salary',
    definition:
      'Wages before extras. Includes penalty rates and shift and leave loadings, but excludes superannuation, overtime and bonuses.',
  },
  'target zone': {
    term: 'Target zone',
    definition:
      'WGEA regards a gender pay gap between −5% and +5% as the target range — close enough to zero to be considered balanced. Gaps outside this band favour men (above +5%) or women (below −5%).',
  },
  quartile: {
    term: 'Pay quartile',
    definition:
      'Line all employees up from lowest-paid to highest-paid and split them into four equal groups of 25%. The upper quartile is the best-paid 25%; the lower quartile is the least-paid 25%.',
  },
  'upper quartile': {
    term: 'Upper quartile',
    definition: 'The best-paid 25% of employees. If women are under-represented here, the pay gap widens.',
  },
  'lower quartile': {
    term: 'Lower quartile',
    definition: 'The least-paid 25% of employees, where women are often over-represented.',
  },
  anzsic: {
    term: 'ANZSIC',
    definition:
      'The Australian and New Zealand Standard Industrial Classification — the official system for grouping businesses by their main activity. Employers pick a detailed “class”, which rolls up into one of 19 broad industry “divisions”.',
  },
  abn: {
    term: 'ABN',
    definition: 'Australian Business Number — the unique identifier for a business, used here to identify each employer.',
  },
  sector: {
    term: 'Sector',
    definition:
      'Whether the employer reported through WGEA’s private-sector reporting or the Commonwealth public-sector reporting.',
  },
  wgea: {
    term: 'WGEA',
    definition:
      'The Workplace Gender Equality Agency — the Australian Government agency that collects gender equality data from employers with 100+ staff and publishes their pay gaps each year.',
  },
  'relevant employer': {
    term: 'Relevant employer',
    definition:
      'An employer required to report to WGEA — generally those with 100 or more employees (occasionally as few as 80 under the Act).',
  },
  'corporate group': {
    term: 'Corporate group',
    definition:
      'A parent company plus its subsidiaries, counted together. A group becomes reportable once its combined headcount reaches 100, even if individual subsidiaries are smaller.',
  },
  'year-on-year': {
    term: 'Year-on-year change',
    definition:
      'The change in an employer’s gap between the current reporting year (2024-25) and the prior year (2023-24). A negative change (in percentage points) means the gap narrowed.',
  },
};

export function lookup(key: string): GlossaryEntry | null {
  return glossary[key.toLowerCase()] ?? null;
}
