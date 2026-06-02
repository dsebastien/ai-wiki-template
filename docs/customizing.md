---
title: Customizing
nav_order: 8
---

# Customizing

What to edit, and where.

### Layout

```
src/
  styles/
    main.css            # Tailwind v4 entry. @import order matters.
    components.css      # Component classes (.card, .hero, …) via @apply
    themes/             # 5 themes + your custom ones
      knowii.css
      paper.css
      …
  templates/            # HTML templates (Mustache-style {{var}} placeholders)
    base.html
    article.html
    index.html
    browse.html
    graph.html
  client/               # Client-side JS, copied verbatim to public/js/
    app.js              # Theme toggle + search modal
    graph.js            # Force-graph rendering
  assets/               # Favicons (favicon.svg / favicon.png / favicon.ico)
scripts/
  build.ts              # Renders content + templates → public/
  sync.ts               # External markdown folder → ./content/
  serve.ts              # Local static server
```

### Visual tokens

The fastest way to re-skin is to clone an existing theme. See [themes](themes.md).

### Component CSS

`src/styles/components.css` defines every component class (`.hero`, `.card`, `.cta-card`, `.prose h2`, etc.) using Tailwind v4 `@apply` over the theme tokens.

```css
.card {
  @apply flex flex-col gap-2.5 p-5 md:p-6 rounded-card border border-line bg-card-subtle text-ink
         transition-[transform,border-color,background,box-shadow] duration-150;
}
```

To restyle:

- Tweak utilities in the `@apply` directive (`p-5` → `p-6`, `gap-2.5` → `gap-3`).
- Need an arbitrary value Tailwind doesn't have? Use a raw CSS line: `letter-spacing: -0.018em;`.
- Need `color-mix()` for a hover tint? Use a raw line — Tailwind doesn't model `color-mix` with theme tokens directly (the `color-mix` utility doesn't compose with arbitrary tokens cleanly).

The build runs Tailwind's CLI: `bunx @tailwindcss/cli -i src/styles/main.css -o public/css/style.css --minify`. Components live in `@layer components` so utility classes you'd write in templates take precedence.

### Templates

`src/templates/*.html` are plain HTML with `{{placeholder}}` substitution. No JSX, no template inheritance — just string interpolation done by `build.ts` (see `render()` function).

Placeholders available in `base.html`:

- `{{title}}`, `{{description}}`, `{{canonical}}`, `{{body_class}}`, `{{body}}`
- `{{site_title}}`, `{{default_mode}}`, `{{built_at}}`
- `{{mode_toggle_html}}`, `{{footer_author_html}}`, `{{font_links_html}}`, `{{favicon_links_html}}`

Article (`article.html`):

- `{{title}}`, `{{meta_html}}`, `{{toc_html}}`, `{{content_html}}`, `{{backlinks_html}}`, `{{article_cta_html}}`

Index (`index.html`):

- `{{eyebrow}}`, `{{headline}}`, `{{tagline}}`, `{{article_count}}`, `{{source_count}}`, `{{cta_hero_html}}`, `{{featured_html}}`, `{{cta_products_html}}`

Browse (`browse.html`):

- `{{browse_html}}`, `{{article_count}}`, `{{source_count}}`

Graph (`graph.html`):

- `{{node_count}}`, `{{edge_count}}`

Modify any template freely. Add new placeholders by passing them in the `render(tpl, vars)` call in `scripts/build.ts`.

### Client JS

Two files:

- `src/client/app.js` — theme mode toggle (light/dark persisted to `localStorage`), the `/` keyboard shortcut, the search modal backed by a prebuilt Lunr index (`/search-index.json`).
- `src/client/graph.js` — knowledge graph using [force-graph](https://github.com/vasturiano/force-graph). Reads `/graph.json` (emitted by the build), renders to canvas, supports zoom-aware labels, focus-on-click neighborhood highlighting, search filtering, min-degree slider, source toggle.

Both files are plain JS (no bundler). Edit and rebuild — they're copied verbatim into `public/js/`.

### Build pipeline

`scripts/build.ts` is ~450 lines. Single file. Reads:

1. `site.config.json`
2. The chosen theme file (extracts `@import url(...)` fonts → `<link>` tags, writes the rest to `active-theme.css`)
3. The corpus (BFS from `entryNote`, with the filter)
4. Templates

Writes:

1. One HTML page per discovered note
2. `index.html`, `browse.html`, `graph.html`
3. `graph.json` (nodes + edges)
4. `search-index.json` (prebuilt Lunr index + lookup table)
5. `css/style.css` (via Tailwind CLI)
6. `js/*.js` (copied from `src/client/`)
7. `favicon.*`, `sitemap.xml`, `robots.txt`, `CNAME` (if configured)

All synchronous except for the optional CTA fetch (top-level `await`).

### Updating from upstream

To pull template improvements into your wiki repo:

```sh
git remote add upstream https://github.com/dsebastien/ai-wiki-template.git
git fetch upstream
git merge upstream/main      # or cherry-pick scripts/, src/, .github/
```

What's preserved on merge:

- `site.config.json` (yours)
- `content/` (yours)
- `public/` (gitignored)
- `node_modules/` (gitignored)

What gets refreshed:

- `src/`, `scripts/`, `package.json`, `.github/workflows/`

Resolve conflicts in `site.config.json` if both branches changed it.

### Killing features you don't want

- **No graph**: remove the link from `base.html` nav and delete `templates/graph.html`. The build still emits `graph.html` if the template exists; remove it from `build.ts` `renderShell` call too.
- **No search**: drop the search modal block from `base.html` and remove the Lunr `<script>`. The build still generates `search-index.json` — that's fine, it's just unused.
- **No CTAs**: leave `ctaProducts` empty and `ctaTags: []`. The build emits nothing for the CTA section.
- **No theme toggle**: `themeToggle: false` in config.
- **No browse page**: delete `templates/browse.html` and the route in `build.ts` (and the nav link in `base.html`).
