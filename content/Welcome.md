---
public_note: true
---

# Welcome

This is the **entry note** for the example site. The build crawls outward from here through `[[wikilinks]]` to discover the whole corpus. Notes that pass the `filter` in `site.config.json` get published.

## How to use this template

1. Click **Use this template** on GitHub or fork the repo.
2. Edit `site.config.json`:
   - `entryNote` — the markdown file the build starts from
   - `contentDir` — directory containing every reachable note (defaults to `entryNote`'s folder)
   - `filter` — frontmatter key/value gate (default: `{ "public_note": true }`)
   - `theme` — one of `default`, `paper`, `terminal`, `moss`, `stark`
   - branding, CTAs, hero copy
3. Commit your notes into `content/` (or any directory and point `contentDir` at it).
4. Push to `main`. The bundled workflow builds and deploys to GitHub Pages.

## Optional: sync from another folder

If your authoritative notes live elsewhere (an Obsidian vault, another repo, a synced folder), set `contentSource` in `site.config.json` and run `bun run sync` before each build. The template ships a generic sync that copies `*.md` from any directory.

## Cross-linking

Wikilinks: `[[Another Article]]` resolves to `/another-article.html`. Aliases: `[[Another Article|see also]]`.

## What you get

- Tailwind v4 + 5 swappable themes (light + dark per theme)
- Force-directed knowledge graph (canvas, zoom-aware labels, focus mode)
- Client-side search (Lunr, prebuilt index)
- Per-article TOC, backlinks, reading time
- GitHub Pages + Cloudflare Pages ready

## References

- [Another Article](#) — wikilink demo: [[Another Article]]
