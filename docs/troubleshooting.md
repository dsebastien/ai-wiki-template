---
title: Troubleshooting
nav_order: 9
---

# Troubleshooting

### `missing site.config.json`

The build couldn't find `site.config.json` in the current working directory. Run `bun run build` from the repo root, not from a subfolder.

### `entryNote not found: <path>`

`entryNote` in `site.config.json` doesn't resolve to an existing file. Check:

- The path is relative to the repo root (not `content/` or `src/`).
- The file actually exists. Case matters on Linux.
- If you sync from an external folder, did you run `bun run sync` first?

### `entry note does not pass filter`

The entry note exists but its frontmatter doesn't satisfy `filter`. Either:

- Add the right key to the entry note's frontmatter, e.g. `public_note: true`.
- Or relax the filter — e.g. `"filter": {}` to disable filtering entirely.

### `unknown theme: <name>`

`site.config.json` → `theme` references a file that doesn't exist in `src/styles/themes/`. The build log lists the valid names. Spelling is case-sensitive.

### Build succeeds but `discovered N docs` is much smaller than expected

The build only includes notes **reachable from `entryNote` via wikilinks** AND **passing the filter**. Common causes:

- Notes have `public_note: false` (or it's missing).
- Notes use markdown links (`[text](file.md)`) instead of wikilinks (`[[file]]`). Markdown links are not traversed.
- Notes are in a different folder than `contentDir`.
- The entry note doesn't link to them (directly or transitively).

Fix: open the entry note in Obsidian (or any editor), use it as a hub that links to your other root-level pages, and let the rest cascade from there.

### Wikilinks render as dashed/missing

The link target couldn't be resolved against `contentDir`. Causes:

- The note doesn't exist in `content/` — only synced or copied?
- The note exists but `public_note: false` filtered it out.
- A typo in the wikilink text.
- The `titlePrefix` setting is wrong — e.g. `[[Foo]]` should resolve to `AI Wiki - PKM - Foo.md` only if `titlePrefix: "AI Wiki - PKM - "`.

### Tailwind compilation error

If the build fails at `compiling tailwind...`, the most common cause is invalid `@apply` in `components.css` referencing a utility that doesn't exist:

- All theme tokens (`bg-bg-elev`, `text-ink-soft`, etc.) require `@theme inline` in `src/styles/main.css` to define them. Don't remove that block.
- Tailwind v4 requires `@import 'tailwindcss';` as the **first non-comment line** of `main.css`. Theme `@import url(...)` for fonts go after, then `@theme inline { ... }`.

### Mode toggle button has no effect

Common causes:

- `data-mode` attribute isn't on `<html>`. Check that `base.html` has `<html data-mode="{{default_mode}}">`.
- Browser blocked the inline bootstrap script. Some strict CSP setups will. Move the bootstrap into `app.js` if so.
- Your theme file doesn't define `[data-mode='light']` (or `'dark'`) tokens. The toggle works, but tokens don't change. Check `src/styles/themes/<name>.css`.

### Search returns no results

- The search index lives at `/search-index.json`. Visit it directly in your browser. Empty array? The build didn't index any notes. Either the corpus is empty or filtering removed everything.
- Lunr is loaded from a CDN by default (`https://cdn.jsdelivr.net/npm/lunr@2.3.9/lunr.min.js`). If that's blocked (corporate network, CSP), self-host it: drop `lunr.min.js` in `static/js/` and update the `<script>` tag in `base.html`.

### Graph renders empty / blank canvas

- Check the browser console. If `force-graph` failed to load, the CDN is blocked. Self-host the same way as Lunr.
- If the graph data is present but no nodes render, `graph.json` is empty — same root cause as a small `discovered N docs` (no reachable notes).

### CTAs missing on homepage

- `ctaProducts` is empty AND `ctaTags` is empty → no CTAs shown (intentional).
- `ctaTags` is set but the fetch fails → check the build log for `CTAs: failed to fetch …`. Causes: network down, CORS, the endpoint returned non-200.
- `ctaProducts` is set but invalid → check JSON structure. Each entry needs at least `title` and `href`.

### CI build fails with "frozen lockfile" error

Bun's CI install is strict. If your `bun.lock` is out of sync with `package.json`:

```sh
bun install               # local — refreshes bun.lock
git add bun.lock
git commit -m "chore: refresh lockfile"
git push
```

### Pushing fails with "refusing to allow an OAuth App to create or update workflow"

Your GitHub token lacks the `workflow` scope. Run:

```sh
gh auth refresh -s workflow
git push
```

### Build is slow

Cold builds: ~5s for a ~250-note site (most time in Tailwind compile). If yours is much slower:

- Are you running on a network filesystem? `content/` reads should be local. Move the repo off NFS/SMB.
- Is the corpus huge (>1000 notes)? Profile the BFS — large graphs can have O(N²) wikilink resolution. Open an issue with the numbers.

Incremental builds aren't supported. Every `bun run build` is a full rebuild. For a ~250-note wiki this takes ~100ms after the first run (Bun caches imports). For 1000+ notes, full rebuild can hit 1–2s.
