---
title: CTAs
nav_order: 6
---

# CTAs

The homepage has a "Go deeper" grid of product/resource cards. Articles get a compact "Enjoying the wiki?" strip at the bottom. Both use the same data source — defined once in `site.config.json`, rendered twice.

There are **two modes** for populating CTAs. Pick one.

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
| `badge` | no | Pink pill in the top-right corner (e.g. `"Flagship"`, `"Featured"`) |

When `ctaProducts` is non-empty, the build uses it as-is. The first 2 items also appear in the in-article strip.

### Mode 2: Dynamic (fetch at build time)

Leave `ctaProducts` empty and configure `ctaTags` + `ctaSource`:

```jsonc
{
  "ctaTags": ["pkm", "obsidian", "knowledge-management"],
  "ctaMax": 4,
  "ctaSource": "https://store.dsebastien.net/products-light.json",
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
      "id": "knowii-community",
      "name": "Knowii: Complete Knowledge System & Community",
      "shortDescription": "Master Information and AI in One Place",
      "tags": ["pkm", "personal-knowledge-management", "obsidian", "…"],
      "mainCategory": "community",
      "priceTier": "subscription",
      "href": "https://developassion.gumroad.com/l/knowii",
      "badge": "flagship",
      "featured": true,
      "bestseller": true,
      "bestValue": true,
      "priority": 100
    }
  ]
}
```

### Ranking

When dynamic, products are ranked by:

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

### Hard rule: no prices

**The dynamic mode never includes numeric prices**, by design. The reasoning:

- Prices drift; rebuilding every wiki on every price change is wasteful.
- The click-through goes to the store anyway, which has the live price.
- A kicker like "Premium · Knowledge Work" focuses on the value tier, not the dollar amount.

If you want a different policy (e.g. show prices on a SaaS landing page), use Mode 1 (explicit `ctaProducts`) and hardcode the prices yourself.

### Graceful failure

If the fetch fails (network down, endpoint offline, CORS misconfigured), the build logs a warning and ships **without** the CTA section. The rest of the site builds normally. Check the build log for `CTAs: failed to fetch …`.

### Hosting your own products catalog

The default `ctaSource` is `https://store.dsebastien.net/products-light.json` — the DeveloPassion store's public catalog. To use your own:

1. Publish a JSON file matching the shape above at any URL with CORS open (`Access-Control-Allow-Origin: *`).
2. Set `ctaSource` to that URL in `site.config.json`.
3. Set `ctaTags` to the keywords your wiki's audience cares about.

The catalog can be a hand-written static JSON file, or generated from another data source (e.g. a Shopify export, Notion database, your own product registry). The only contract is the shape and that CORS is open.

### Both modes together

`ctaProducts` always wins. If you have an explicit array, the dynamic fetch is skipped. Use the explicit mode to override a single page's CTAs (e.g. a launch campaign) without removing the global `ctaTags` config.
