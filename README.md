# Gender Pay Gap (AU)

**Search the gender pay gap at 8,600+ Australian employers — compare to industry and national medians, see year-on-year change, and where women sit on the pay ladder.**

🔗 **Live:** [https://au-pay-gap.benrichardson.dev](https://au-pay-gap.benrichardson.dev)

## What is this?

Every Australian employer with 100 or more staff must report to the Workplace Gender Equality Agency (WGEA) each year, and WGEA publishes each employer's gender pay gap. But the official Data Explorer only shows one employer at a time — you can't rank, compare, or see the big picture.

This site loads the **entire** dataset into one fast, searchable interface. Look up any employer, rank every company in an industry, see how gaps are distributed, and — crucially — visualise the *structural* driver of the gap: where women actually sit across the four pay quartiles. A single "20% gap" number hides the fact that women often cluster in the lowest-paid quartile and thin out towards the top.

It covers the **2024-25** reporting year (published March 2026) with **2023-24** figures alongside for year-on-year comparison, for 8,600+ individual employers and 1,800+ corporate groups.

## Who is this for?

Australian employees checking their own workplace, job-seekers comparing companies, journalists slicing the data by industry for a story, and HR / diversity professionals benchmarking against peers. Everything is framed in plain language with definitions on tap, because a gender pay gap is easy to misread — it is **not** the same as unequal pay for the same job.

## Data Sources

| Source | What it provides | Update frequency |
|--------|-------------------|-----------------|
| [WGEA Employer Gender Pay Gaps spreadsheet](https://www.wgea.gov.au/publications/employer-gender-pay-gaps-report) | Per-employer & corporate-group median/average gap (total remuneration and base salary), 2024-25 + 2023-24, women's share and average pay by quartile, ANZSIC industry, sector, size | Annual (March) |

## Features

- **Explorer** — sortable, filterable, searchable table of every employer or corporate group; filter by industry, sector, size and gap direction.
- **Employer drill-down** — click any employer for all four gap measures, year-on-year movement, a women-by-quartile pyramid, the pay ladder ($ per quartile), and comparison to industry + national medians. Deep-linkable via URL.
- **Industry rankings** — all 19 ANZSIC divisions ranked by gap.
- **The glass pyramid** — women's share across the four pay quartiles, nationally and by industry.
- **Distribution** — histogram of every employer's gap with the ±5% target zone highlighted.
- **Industry × size heatmap** — spot the worst-performing combinations at a glance.
- **Movers** — biggest year-on-year improvers and deteriorations.
- **Insights** — auto-generated findings plus a scatter of top-quartile representation vs the gap.
- **Metric switch** — median vs average, base salary vs total remuneration, applied across every view.
- Glossary tooltips, an About/methodology panel, and full keyboard/mobile support.

## Tech Stack

- **Runtime:** Vanilla TypeScript (no framework)
- **Build:** Vite 6
- **Testing:** Vitest (52 tests)
- **Hosting:** GitHub Pages (static, no backend)
- **Data:** GitHub Actions pipeline → compact JSON. Hand-rolled SVG for every chart (no chart libraries).

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Production build
npm run build

# Preview production build
npm run preview
```

## How it works

`pipeline/collect.mjs` downloads the official WGEA spreadsheet, parses it with SheetJS, and writes compact JSON (`public/data/{employers,groups,meta}.json`). A GitHub Action re-runs yearly, after WGEA's annual publication, and commits any changes, so the site refreshes automatically when WGEA publishes new figures. The frontend fetches that JSON once and renders every view client-side.

## License

MIT
