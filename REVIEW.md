# Gender Pay Gap (AU) — Build Review

This file exists only to create a reviewable PR. All code is already deployed on `main`.

**Merge this PR to acknowledge the build.** Closing without merging is also fine.

## Links

- **GitHub Pages:** https://ben-gy.github.io/au-pay-gap/ *(redirects to custom domain once DNS is set)*
- **Custom domain:** https://au-pay-gap.benrichardson.dev *(live after DNS + cert below)*

## What it is

Search the gender pay gap at 8,600+ Australian employers (official WGEA 2024-25 data), made searchable and comparable in one interface. Seven views: Explorer, Industries, Glass Pyramid, Distribution, Industry×Size Matrix, Movers, and Insights — plus a rich employer drill-down and a metric switch (median/average × base salary/total remuneration).

## DNS setup

Already provisioned in Cloudflare (`benrichardson.dev` zone):

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `au-pay-gap` | `ben-gy.github.io` | DNS only (grey cloud) |

If the TLS cert isn't live yet, cycle it:
```bash
gh api repos/ben-gy/au-pay-gap/pages -X PUT -f cname=""
sleep 3
gh api repos/ben-gy/au-pay-gap/pages -X PUT -f cname="au-pay-gap.benrichardson.dev"
```
