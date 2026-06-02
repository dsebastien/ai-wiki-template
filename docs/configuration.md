---
title: Configuration
nav_order: 3
---

# Configuration reference

Everything site-specific lives in `site.config.json` at the repo root. The build reads it once and uses the values for templating, routing, theme selection, and CTA fetching.

### Full example

```jsonc
{
  // Identity
  "siteTitle": "PKM Wiki",
  "siteTagline": "A living reference on Personal Knowledge Management.",
  "siteUrl": "https://pkm.dsebastien.net",
  "author": "Sébastien Dubois",
  "authorUrl": "https://www.dsebastien.net",
  "brandName": "Knowii",
  "brandUrl": "https://www.knowii.net",
  "cname": "pkm.dsebastien.net",

  // Corpus discovery
  "entryNote": "content/AI Wiki - PKM - Index.md",
  "contentDir": "content",
  "contentSource": "/home/me/vault/Wikis/PKM",
  "filter": { "public_note": true },
  "titlePrefix": "AI Wiki - PKM - ",
  "syncSkipPatterns": ["^AI Wiki - PKM - Log"],

  // Theme
  "theme": "knowii",
  "themeToggle": true,
  "defaultMode": "dark",

  // Homepage hero
  "heroEyebrow": "A living PKM wiki",
  "heroHeadline": "Think clearly. Build a system that thinks with you.",
  "featured": [
    "personal-knowledge-management",
    "zettelkasten-method",
    "atomic-notes"
  ],
  "ctaHero": {
    "label": "Browse all articles",
    "href": "/browse.html",
    "secondary": { "label": "Start with PKM 101", "href": "/personal-knowledge-management.html" }
  },

  // CTAs (see ctas.md for full details)
  "ctaTags": ["pkm", "obsidian"],
  "ctaMax": 4,
  "ctaSource": "https://store.dsebastien.net/products-light.json",
  "ctaProducts": []
}
```

### Identity

| Field | Type | Default | Description |
|---|---|---|---|
| `siteTitle` | string | `"Wiki"` | Used in `<title>`, header brand, footer, sitemap |
| `siteTagline` | string | `""` | One-line description for `<meta description>` and og:description |
| `siteUrl` | string | `""` | Canonical base URL (used in `<link rel=canonical>` and sitemap.xml). Override at build time with `SITE_URL=` env |
| `author` | string | `""` | Shown in the footer ("Curated by …"). Optional |
| `authorUrl` | string | `""` | Link target for the author name |
| `brandName` | string | `""` | Optional brand line in the footer (e.g. `"Knowii"`) |
| `brandUrl` | string | `""` | Link target for the brand |
| `cname` | string | `""` | If set, writes `public/CNAME` for GitHub Pages custom domains |

### Corpus discovery

| Field | Type | Default | Description |
|---|---|---|---|
| `entryNote` | string | **required** | Path (absolute or relative to repo root) to the markdown file the build starts from. BFS traverses `[[wikilinks]]` outward |
| `contentDir` | string | `dirname(entryNote)` | Where the build looks for linked notes |
| `contentSource` | string | `""` | Path read by `bun run sync` to copy markdown into `content/`. Skip if you commit `content/` directly |
| `filter` | object | `{ "public_note": true }` | Frontmatter key/value gate. A note is included only if all key/value pairs match. Pass `{}` to disable filtering |
| `titlePrefix` | string | `""` | Strip this prefix from filenames when generating slugs and display titles. Useful for naming conventions like `AI Wiki - X - <Title>` |
| `syncSkipPatterns` | string[] | `[]` | List of regex patterns. Filenames matching any pattern are skipped by `bun run sync` |

### Theme

| Field | Type | Default | Description |
|---|---|---|---|
| `theme` | string | `"knowii"` | One of `knowii`, `paper`, `terminal`, `moss`, `stark`. See [themes](themes.md) |
| `themeToggle` | bool | `true` | Show the light/dark toggle button in the header |
| `defaultMode` | `"dark"` \| `"light"` | `"dark"` | Initial mode for new visitors (overridden by `localStorage` if user has toggled) |

### Homepage hero

| Field | Type | Default | Description |
|---|---|---|---|
| `heroEyebrow` | string | `"Living reference"` | Small uppercase tag above the headline |
| `heroHeadline` | string | `siteTitle` | The big H1 on the homepage |
| `featured` | string[] | `[]` | Slugs of notes to surface as cards on the homepage. Slug = lowercased, hyphenated `displayTitle` (after `titlePrefix` stripping) |
| `ctaHero.label` | string | — | Primary button label |
| `ctaHero.href` | string | — | Primary button link |
| `ctaHero.secondary` | `{label, href}` | — | Optional ghost button |

### CTAs

See the dedicated [CTAs](ctas.md) page. Summary:

| Field | Type | Default | Description |
|---|---|---|---|
| `ctaProducts` | array | `[]` | Explicit, static CTA cards. When non-empty, used as-is |
| `ctaTags` | string[] | `[]` | When `ctaProducts` is empty, the build fetches `ctaSource` and selects products whose tags intersect with these |
| `ctaMax` | number | `4` | Max number of CTAs to render |
| `ctaSource` | string | `https://store.dsebastien.net/products-light.json` | URL of the public products catalog the build fetches |

### Environment variable overrides

These environment variables take precedence over `site.config.json` values:

| Env | Overrides | Notes |
|---|---|---|
| `SITE_URL` | `siteUrl` | Useful in CI where the URL is set per-environment |
| `WIKI_SRC` | `contentSource` (for `sync` only) | One-shot override for the sync script |
| `CONTENT_SRC` | same as `WIKI_SRC` | Alias |
| `VAULT_ROOT` | base for relative `contentSource` | Defaults to `~/notesSeb` only as a legacy fallback in the sync script — prefer absolute paths in config |
