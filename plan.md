# Site Plan: Gender Pay Gap (AU)

## Overview
- **Name:** Gender Pay Gap (AU)
- **Repo name:** au-pay-gap
- **Tagline:** Search the gender pay gap at 8,600+ Australian employers — see how your workplace compares to its industry, whether it's closing the gap, and where women sit on the pay ladder.

### Naming Convention
Country-specific → "Gender Pay Gap (AU)".

## Target Audience
Australian employees looking up their own employer, job-seekers comparing companies, journalists and HR/D&I professionals, and researchers. Primarily general public on mobile and desktop who have seen a headline ("the gender pay gap at X is 30%") and want to check a specific company or industry.

## Value Proposition
WGEA publishes ~8,600 employer gender pay gaps once a year inside a slow, one-employer-at-a-time Data Explorer. This site loads the entire dataset into one fast, searchable, cross-comparable interface: rank every employer, compare to industry and national medians, see year-on-year movement, and visualise where women actually sit across the four pay quartiles — the "glass pyramid" that a single number hides.

## Data Sources
| Source | URL | What it provides | Update frequency | Auth required? |
|--------|-----|-------------------|-----------------|----------------|
| WGEA Employer Gender Pay Gaps Spreadsheet | https://www.wgea.gov.au/sites/default/files/documents/Employer-Gender-Pay-Gaps-Spreadsheet.xlsx | Per-employer & corporate-group GPG (median/avg, total-rem/base-salary), 2024-25 + 2023-24, women % and average pay by quartile, ANZSIC industry, sector, size | Annual (March) | No |
| WGEA methodology / definitions | https://www.wgea.gov.au/Data-Explorer | Glossary + interpretation guidance | Annual | No |

## Key Features
1. **Employer explorer** — sortable, filterable, searchable table of all 8,600+ employers; filter by industry, sector, size, gap direction; toggle metric (median/avg × total-rem/base-salary).
2. **Employer drill-down** — click any employer for full breakdown: four GPG metrics, YoY change, women-by-quartile pyramid, pay-ladder ($ per quartile), and comparison to industry + national medians. Deep-linkable via URL hash.
3. **Industry rankings** — all 19 ANZSIC divisions ranked by median GPG with women's representation, drill into any industry.
4. **The glass pyramid** — visualises women's share across the four pay quartiles (national + per-employer), exposing under-representation at the top.
5. **Distribution** — histogram of employer gaps with the ±5% WGEA "target zone" highlighted; how many employers favour men vs women.
6. **Industry × size matrix** — heatmap of median GPG revealing which industry/size combinations fare worst.
7. **Movers** — biggest year-on-year improvers and deteriorations vs 2023-24.
8. **Insights** — auto-generated findings (extreme gaps, employers where women out-earn men, industries above national, correlation of top-quartile representation with the gap).

## Target Audience (detailed)
Mixed. A worker on their phone who just wants their employer's number and a plain-English read on whether it's good or bad; a journalist on desktop slicing by industry for a story; an HR lead benchmarking against peers. Tech-comfortable but not data-analysts — everything needs plain-language framing and definitions on tap. Emotionally charged topic → tone must be neutral, factual, non-editorial.

## Value Proposition (detailed)
See above — turn an annual, entity-at-a-time government explorer into a whole-of-dataset comparison tool with insight framing the raw explorer never provides.

## Style Direction
**Tone:** civic / authoritative, calm and neutral — this is a sensitive topic, avoid editorialising.
**Colour palette:** light, clean, trustworthy (government-portal feel). Neutral warm-white surfaces, deep indigo primary accent. Gap direction uses an accessible **diverging** scale — warm amber→red for gaps favouring men, teal for gaps favouring women, neutral green for the ±5% target zone. Deliberately avoids the cliché pink/blue gender coding.
**UI density:** balanced — data-dense tables but generous framing, cards, and whitespace so a lay reader isn't overwhelmed.
**Dark/light theme:** light (civic/consumer/general audience).
**Reference sites for tone:** WGEA Data Explorer (subject authority), gov.uk gender pay gap service (clean civic data tool), fuelaustralia.org (practical public utility).

## Technical Architecture
- **Stack:** Vanilla TypeScript + Vite (single-page, multi-view dashboard; hand-rolled views; no routing lib needed).
- **Data strategy:** pipeline — Node script downloads the WGEA xlsx, parses with SheetJS, emits compact JSON to `public/data/`. Committed data means instant load; GitHub Action refreshes weekly.
- **Key libraries:** SheetJS (`xlsx`) in the pipeline only. No runtime chart libs — hand-rolled SVG. No map (data has no geography).

## Layout
Fixed header (title, national headline stat, global search, metric toggle, About/`?`). Sticky sub-nav of view tabs. Main content fills remaining space, `max-width: 1600px`. Drill-down opens as a slide-in right panel (full-width sheet on mobile). Sticky footer with attribution + data source + last-updated. Panels stack and controls reflow below 768px.

## Pages/Views
Single page, tabbed views: Explorer (default) · Industries · Glass Pyramid · Distribution · Matrix · Movers · Insights. Plus a slide-in employer detail panel and an About modal.

## Visualization Strategy
1. **Sortable/filterable table (Explorer)** — the core lookup; nothing else lets you find one employer among 8,600.
2. **Horizontal bar rankings (Industries)** — compares the 19 divisions on one metric at a glance; colour-coded by direction.
3. **Quartile representation "pyramid" (Glass Pyramid)** — stacked women/men bars across four pay quartiles; shows the *structural* driver of the gap (women clustered in lower-paid quartiles) that a single % can't. Unique insight view.
4. **Histogram (Distribution)** — shows the spread of gaps and how many employers sit in/outside the ±5% target zone; reveals the shape journalists quote.
5. **Industry × size heatmap (Matrix)** — two categorical dimensions at once; instantly surfaces the worst-performing cells.
6. **Diverging YoY bar list (Movers)** — ranks change, not level; answers "who is actually improving".
7. **Scatter (Insights)** — % women in the upper quartile vs median gap, demonstrating the correlation; plus auto-generated finding cards.
