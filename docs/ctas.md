---
title: CTAs
nav_order: 6
---

# CTAs

The homepage has a "Go deeper" grid of product/resource cards. Articles get a compact "Enjoying the wiki?" strip at the bottom. Both use the same data source — defined once in `site.config.json`, rendered twice.

CTAs are **opt-in**. By default the template renders no CTA section. Set `ctaProducts` (explicit) or `ctaSource` + `ctaTags` (dynamic fetch) when you want them.

There are **two modes**.

### Mode 1: Explicit (static)

Set `ctaProducts` to a hand-crafted array:

```jsonc
{
  "ctaProducts": [
    {
      "title": "My Course",
      "kicker": "Course · Self-paced",
      "blurb": "Everything I know about X, in one place.",
      "href": "https://example.com/my-course",
      "badge": "Bestseller"
    }
  ]
}
```

| Field | Required | Description |
|---|---|---|
| `title` | yes | Card title |
| `href` | yes | Click target |
| `kicker` | no | Small uppercase line above the title (e.g. `"Course · Self-paced"`) |
| `blurb` | no | One-line description |
| `badge` | no | Pill in the top-right corner (e.g. `"Flagship"`, `"Featured"`) |

When `ctaProducts` is non-empty, the build uses it as-is. The first 2 items also appear in the in-article strip.

### Mode 2: Dynamic (fetch at build time)

Leave `ctaProducts` empty and configure `ctaTags` + `ctaSource`:

```jsonc
{
  "ctaTags": ["pkm", "obsidian", "knowledge-management"],
  "ctaMax": 4,
  "ctaSource": "https://your-store.example.com/products-light.json",
  "ctaProducts": []
}
```

The build fetches `ctaSource` at build time, filters products whose `tags` intersect with `ctaTags`, ranks them, and renders the top `ctaMax`. The catalog is expected to be a JSON document of this shape:

```jsonc
{
  "generatedAt": "2026-…",
  "count": 21,
  "products": [
    {
      "id": "my-course",
      "name": "My Course",
      "shortDescription": "Stop X. Start Y.",
      "tags": ["pkm", "obsidian", "…"],
      "mainCategory": "courses",
      "priceTier": "premium",
      "href": "https://example.com/my-course",
      "badge": "flagship",
      "featured": true,
      "bestseller": true,
      "bestValue": true,
      "priority": 100
    }
  ]
}
```

Host this JSON wherever you like. Any URL with CORS open (`Access-Control-Allow-Origin: *`) works. Use a static generator (e.g. a build step that reads a database/CMS export), a serverless function, or a hand-maintained file.

### Ranking

Products are ranked by:

```
score = matchedTags × 1000
      + bestValue   × 500
      + bestseller  × 250
      + featured    × 100
      + priority    (0–200 typical)
```

Top `ctaMax` win. `matchedTags` is the count of tags in the product's `tags` array that intersect with the wiki's `ctaTags`.

### Kicker rendering

The kicker line is built from `priceTier` + `mainCategory`:

| `priceTier` | Label component |
|---|---|
| `free` | "Free" |
| `subscription` | "Membership" |
| `premium` | "Premium" |
| `enterprise` | "Enterprise" |
| `standard`, `budget` | (omitted) |

`mainCategory` is title-cased. Example: `priceTier="subscription"`, `mainCategory="community"` → `"Membership · Community"`.

### No numeric prices

The dynamic mode intentionally never includes numeric prices. Prices drift; the click-through goes to your store anyway, which has the live price; the kicker focuses on tier ("Premium · Knowledge Work") rather than the dollar amount.

If you want prices on cards, use Mode 1 (explicit `ctaProducts`) and hardcode the prices.

### Graceful failure

If the fetch fails (network down, endpoint offline, CORS misconfigured, source not set), the build logs a warning and ships **without** the CTA section. The rest of the site builds normally.

### Both modes together

`ctaProducts` always wins. If you have an explicit array, the dynamic fetch is skipped. Use the explicit mode to override a single site's CTAs (e.g. a launch campaign) without removing the global `ctaTags` config.
