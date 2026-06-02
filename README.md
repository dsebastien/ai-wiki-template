# ai-wiki-template

A static-site template for cross-linked markdown knowledge bases. Built with Bun. Themable. Knowledge graph + search included. Deploys to GitHub Pages or Cloudflare Pages.

**📖 Full documentation: <https://dsebastien.github.io/ai-wiki-template>**

**Vault-agnostic.** Point it at an entry note, give it a folder of markdown files, optionally provide a frontmatter filter. The build crawls outward from the entry note through `[[wikilinks]]`, applies the filter, and renders only what's reachable and passes.

## What this is

- One HTML page per note, with `[[wikilinks]]` resolved across the corpus
- Backlinks ("Referenced by") auto-computed
- `browse.html` A-Z index, `graph.html` knowledge graph (canvas, force-directed, zoom-aware labels, focus mode), search modal (Lunr), per-article TOC + reading time
- 5 swappable themes (`default`, `paper`, `terminal`, `moss`, `stark`) — each with light + dark modes
- Product CTAs configurable per-site
- Fully responsive

## Quick start

```sh
bun install
bun run build    # renders ./public
bun run serve    # http://localhost:4321
```

To pull notes from an external directory before building:

```sh
bun run sync && bun run build
```

`sync` reads `contentSource` from `site.config.json` (or `CONTENT_SRC` env). It copies `*.md` from there into `./content`. Skip patterns can be provided.

## Use this as a template

Click **Use this template** on GitHub (or `gh repo create --template <user>/ai-wiki-template`). Then:

1. Edit `site.config.json` — set `entryNote`, `siteTitle`, `siteUrl`, `cname`, `theme`, `filter`, branding, CTAs, featured slugs.
2. Either:
   - Commit your notes into `content/` (or anywhere — point `contentDir` at it), OR
   - Set `contentSource` and run `bun run sync` to copy from another directory.
3. Push to `main`. The bundled workflow `.github/workflows/deploy.yml` builds and deploys to GitHub Pages.

For Cloudflare Pages: build command `bun install && bun run build`, output dir `public`. Set `SITE_URL` env var.

## Config reference

```jsonc
{
  // entry point + corpus
  "entryNote": "content/Welcome.md",          // required: BFS starts here
  "contentDir": "content",                    // where to find linked notes (default: entryNote's dir)
  "contentSource": "",                        // optional: where `sync` reads from
  "filter": { "public_note": true },          // optional: only include notes with matching frontmatter
  "titlePrefix": "",                          // optional: strip this prefix from titles/slugs
  "syncSkipPatterns": ["^Log\\."],            // optional: regex filenames `sync` skips

  // branding / chrome
  "siteTitle": "Example Wiki",
  "siteTagline": "A living reference, synthesized from notes and practice.",
  "siteUrl": "https://example.com",
  "cname": "example.com",
  "author": "Jane Doe",
  "authorUrl": "https://janedoe.com",
  "brandName": "",
  "brandUrl": "",

  // theme
  "theme": "default",         // default | paper | terminal | moss | stark
  "themeToggle": true,        // show light/dark toggle?
  "defaultMode": "dark",      // initial mode

  // homepage hero
  "heroEyebrow": "Living reference",
  "heroHeadline": "Example Wiki",
  "featured": ["another-article"],  // slugs to surface as cards
  "ctaHero": { "label": "Browse", "href": "/browse.html" },

  // CTAs — two modes:
  //   (a) explicit:  set "ctaProducts" to a static array of cards
  //   (b) dynamic:   leave "ctaProducts" empty, set "ctaTags" + "ctaSource"
  //                  → the build fetches a JSON catalog and picks top N
  //                  products whose tags intersect with ctaTags, ranked by
  //                  bestValue > bestseller > featured > priority.
  //                  Always-fresh on rebuild. No hardcoded prices.
  "ctaTags": [],
  "ctaMax": 4,
  "ctaSource": "",            // your products-light.json URL (CORS-open)
  "ctaProducts": []
}
```

## Themes

| Theme    | Vibe                                          | Default mode |
| -------- | --------------------------------------------- | ------------ |
| default  | GitHub-inspired dark slate + blue accent      | dark         |
| paper    | Warm off-white + dark ink + serif display     | light        |
| terminal | Phosphor green on black + JetBrains Mono      | dark         |
| moss     | Forest green + beige + amber + serif          | dark         |
| stark    | Pure white/black + electric blue              | light        |

The mode toggle (light/dark) is per-user (`localStorage`). `defaultMode` sets the initial mode for new visitors.

## Determinism contract

A note is published iff:
- It's reachable via `[[wikilinks]]` from the entry note (or is the entry note itself), AND
- It passes the frontmatter `filter` (default: `{ "public_note": true }`).

The entry note becomes `/index.html`'s hero context; the page itself is your configured hero markup. The entry note's content is not rendered as a standalone page — it's the gateway. Every other discovered note gets its own HTML page.

Dataview `<!-- QueryToSerialize -->` blocks are stripped from output. Wikilinks that resolve to a note outside the discovered corpus render as visible-but-unlinked dashed text.

## Layout

```
site.config.json          # all site-specific knobs
content/                  # markdown corpus (committed, or synced from contentSource)
src/
  styles/
    main.css              # Tailwind v4 entry
    components.css        # component classes (theme-token based)
    themes/<name>.css     # the 5 themes; build copies active one to active-theme.css
  templates/              # base/article/index/browse/graph HTML
  client/                 # app.js (theme+search) + graph.js (force-graph)
  assets/                 # favicon
scripts/
  sync.ts                 # any directory of markdowns → content/
  build.ts                # entry note + filter + content → public/
  serve.ts                # local preview (Bun.serve)
public/                   # build output (gitignored)
```

## License

MIT. Content licensing depends on your source notes.
