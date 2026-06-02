# AGENTS.md

Notes for AI agents and human contributors working on this codebase. Keep these in mind before changing build internals, CSS, or templates.

## Architecture decisions worth remembering

- **Tailwind v4 with `@apply`** over theme tokens in `src/styles/components.css`. Themes only define tokens (`--theme-bg`, `--theme-accent`, etc.); components compose them via Tailwind utilities. Swapping the theme swaps the entire look without touching component CSS.
- **`force-graph` (canvas) over D3 SVG** for the knowledge graph. Handles 200+ nodes smoothly; previous SVG version was unusable on dense graphs.
- **CSS bug fix worth not repeating**: never combine `padding: X 0` and `padding: 0 Y` shorthands on the same element via different classes. The later rule wipes the earlier. Use logical properties (`padding-block` + `padding-inline`).
- **Tailwind v4 rejects nested `@import url(...)`** inside `@import 'tailwindcss';`. Theme fonts are extracted at build time and injected as `<link>` tags in `<head>`.
- **BFS from an entry note + frontmatter filter** as the published-set contract. No "publish all *.md" mode — what you choose to link to is what gets shipped.

## Determinism

The build is fully deterministic — same inputs, same output. No LLM rewriting at build time. Dataview comment blocks are stripped. Wikilinks to notes outside the discovered corpus render as visible-but-unlinked dashed text. Don't introduce non-deterministic behavior (random ordering, timestamp-based output, network fetches that mutate content) without a strong reason.

## File layout

```
content/                  # markdown corpus (committed, or synced from contentSource)
src/
  styles/
    main.css              # Tailwind v4 entry
    components.css        # component classes (theme-token based, @apply)
    themes/<name>.css     # the 5 themes; build copies active one to active-theme.css
  templates/              # base/article/index/browse/graph HTML (Mustache-style {{var}})
  client/                 # app.js (theme+search) + graph.js (force-graph)
  assets/                 # favicon
scripts/
  sync.ts                 # any directory of markdowns → content/
  build.ts                # entry note + filter + content → public/
  serve.ts                # local preview (Bun.serve)
  release.ts              # version bump + commit + tag + push
public/                   # build output (gitignored)
docs/                     # Jekyll-based user guide (served via GitHub Pages from /docs)
```

## Doing changes safely

- Run `bun run build` after any change to `scripts/`, `src/templates/`, `src/styles/`, or `src/client/`. The build is fast (~100ms with cache, ~5s cold) so there's no reason to skip.
- When editing `src/styles/components.css`, use Tailwind utilities via `@apply` where possible. Drop to raw CSS only for things Tailwind can't express cleanly (`color-mix()`, `clamp()`, pseudo-element gradients).
- When editing themes (`src/styles/themes/*.css`), keep the token names consistent across all themes so component classes work everywhere. Adding a new theme = new file with the same 15 `--theme-*` tokens.
- The build does no markdown post-processing beyond `marked` + the wikilink resolver. Don't add per-note LLM rewrites at build time; the published set should be a deterministic function of `content/` + `site.config.json`.

## What lives where

- **`site.config.json`** — everything site-specific. Read by build.ts on startup. No constants should be hardcoded in build.ts that belong here.
- **`scripts/build.ts`** — single file, top-down, no abstractions beyond a few helpers. Keep it readable end-to-end.
- **`src/templates/*.html`** — plain HTML with `{{placeholder}}` substitution. No JSX, no templating engine. The placeholders are explicitly passed by `build.ts`.
- **`src/client/*.js`** — copied verbatim into `public/js/`. No bundler. Vanilla JS only.

## Release

Use the release script:

```sh
bun run release            # patch bump
bun run release minor
bun run release major
bun run release 1.2.3      # explicit
```

It refuses to release with a dirty tree, bumps the version in `package.json`, commits, tags `vX.Y.Z`, and pushes both the commit and the tag. Downstream consumers see the new tag and can update via `git merge upstream/main` or by pulling the tag explicitly.

## See also

- [Documentation site](https://dsebastien.github.io/ai-wiki-template)
- `docs/` — source for the docs site (Jekyll + just-the-docs theme)
- `README.md` — quick start
