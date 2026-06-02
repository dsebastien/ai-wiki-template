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
  "siteTitle": "My Wiki",
  "siteTagline": "A living reference, synthesized from notes and practice.",
  "siteUrl": "https://mywiki.example.com",
  "author": "Jane Doe",
  "authorUrl": "https://janedoe.example.com",
  "brandName": "",
  "brandUrl": "",
  "cname": "mywiki.example.com",

  // Corpus discovery
  "entryNote": "content/Welcome.md",
  "contentDir": "content",
  "contentSource": "",
  "filter": { "public_note": true },
  "titlePrefix": "",
  "syncSkipPatterns": [],

  // Theme
  "theme": "default",
  "themeToggle": true,
  "defaultMode": "dark",

  // Homepage hero
  "heroEyebrow": "Living reference",
  "heroHeadline": "My Wiki",
  "featured": ["welcome", "another-article"],
  "ctaHero": {
    "label": "Browse all articles",
    "href": "/browse.html"
  }
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
| `brandName` | string | `""` | Optional brand line in the footer |
| `brandUrl` | string | `""` | Link target for the brand |
| `cname` | string | `""` | If set, writes `public/CNAME` for GitHub Pages custom domains |

### Corpus discovery

| Field | Type | Default | Description |
|---|---|---|---|
| `entryNote` | string | **required** | Path (absolute or relative to repo root) to the markdown file the build starts from. BFS traverses `[[wikilinks]]` outward |
| `contentDir` | string | `dirname(entryNote)` | Where the build looks for linked notes |
| `contentSource` | string | `""` | Path read by `bun run sync` to copy markdown into `content/`. Skip if you commit `content/` directly |
| `filter` | object | `{ "public_note": true }` | Frontmatter key/value gate. A note is included only if all key/value pairs match. Pass `{}` to disable filtering |
| `titlePrefix` | string | `""` | Strip this prefix from filenames when generating slugs and display titles. Useful for naming conventions like `Wiki - X - <Title>` |
| `syncSkipPatterns` | string[] | `[]` | List of regex patterns. Filenames matching any pattern are skipped by `bun run sync` |

### Theme

| Field | Type | Default | Description |
|---|---|---|---|
| `theme` | string | `"default"` | One of `default`, `paper`, `terminal`, `moss`, `stark`. See [themes](themes.md) |
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

### Environment variable overrides

These environment variables take precedence over `site.config.json` values:

| Env | Overrides | Notes |
|---|---|---|
| `SITE_URL` | `siteUrl` | Useful in CI where the URL is set per-environment |
| `CONTENT_SRC` | `contentSource` (for `sync` only) | One-shot override for the sync script |
