---
title: Content
nav_order: 4
---

# Content

How notes are discovered, filtered, linked, and rendered.

### The entry-note model

The build starts at exactly one file: `entryNote` in `site.config.json`. From there, it walks `[[wikilinks]]` breadth-first. Every note it reaches gets included **iff** it passes the frontmatter `filter`. Unreachable notes are ignored — they don't exist in the output.

This means:

- You decide what gets published by **what you link to**, not what you put in a folder.
- An entire vault can sit in `content/`; only the subset reachable from the entry note ships.
- To "unpublish" a note, remove the wikilinks pointing at it from any reachable page.

The entry note itself becomes the implicit context for the homepage (its content is not rendered as a standalone page — your `index.html` is your hero markup). Every other reached note gets its own HTML page at `/<slug>.html`.

### Frontmatter filter

Notes are included only when all keys in `filter` match in their frontmatter:

```jsonc
// site.config.json
{ "filter": { "public_note": true } }
```

```yaml
# A reachable note
---
public_note: true
---

# Welcome
…
```

A note with `public_note: false` (or missing) is filtered out. To disable filtering entirely:

```jsonc
{ "filter": {} }
```

Multiple keys are AND-ed:

```jsonc
{ "filter": { "public_note": true, "status": "published" } }
```

### Wikilinks

Internal links use Obsidian-style wikilinks:

```md
See [[Zettelkasten Method]] for the foundational practice.

A piped alias: [[Zettelkasten Method|smart notes]] for prose flow.
```

Resolution rules:

- The text inside `[[…]]` is matched against the **filename without `.md`** of every note in `contentDir`.
- If `titlePrefix` is set (e.g. `"AI Wiki - PKM - "`), the resolver also matches against the **stripped** name. So `[[Zettelkasten Method]]` finds `AI Wiki - PKM - Zettelkasten Method.md`.
- If the target exists **and** passes the filter, the link renders as a normal anchor: `<a class="wikilink" href="/zettelkasten-method.html">…</a>`.
- If the target exists but is **filtered out**, OR the target doesn't exist, the link renders as visible-but-unlinked dashed text — pages still ship, but readers see "this is not a live link." The build never fails on a broken link.

### Slugs

Each note's URL is derived from its display title (filename with `titlePrefix` stripped), lowercased and hyphenated, with `(parenthetical)` content removed. Examples:

| Filename | titlePrefix | Slug | URL |
|---|---|---|---|
| `AI Wiki - PKM - Zettelkasten Method.md` | `AI Wiki - PKM - ` | `zettelkasten-method` | `/zettelkasten-method.html` |
| `Atomic Notes.md` | (none) | `atomic-notes` | `/atomic-notes.html` |
| `What's Next (draft).md` | (none) | `what-s-next` | `/what-s-next.html` |

This means renaming a note breaks its URL. Use redirects or commit the renamed file as a new note if you care about backward compatibility.

### Source summaries

Notes with frontmatter `wiki_role: source_summary` get a "source" tag in search and a separate group on the browse page. Use this for literature/reference notes that summarize an external source. They're still real pages, just bucketed differently.

### Dataview blocks

The build strips serialized Dataview comment blocks (`<!-- QueryToSerialize: … -->`, `<!-- SerializedQuery: … -->`, `<!-- SerializedQuery END -->`) from output. The serialized list/table inside the block is kept — only the comment scaffolding is removed. Plays nicely with the [Dataview Serializer](https://github.com/dsebastien/obsidian-dataview-serializer) plugin.

### Reading time

Computed from word count at 220 wpm. Shown in the article header. Not configurable.

### Backlinks

For each note, the build computes the set of other notes whose body contains a wikilink to it (across the discovered corpus). Renders as a "Referenced by" panel at the bottom of the article. No frontmatter required — purely structural.

### Sync from an external folder

If your notes live in another tool (Obsidian vault, Notion export, another repo), set `contentSource` and run `bun run sync` before each build:

```jsonc
// site.config.json
{ "contentSource": "/home/me/vault/Wikis/PKM" }
```

```sh
bun run sync     # copies *.md from contentSource → ./content/
bun run build
```

Override at the command line:

```sh
CONTENT_SRC=/abs/path bun run sync
```

The sync script copies markdown verbatim, applying `syncSkipPatterns` (regex against filename) to exclude e.g. logs and drafts:

```jsonc
{ "syncSkipPatterns": ["^AI Wiki - PKM - Log", "\\.draft\\.md$"] }
```

### Committing content vs syncing

You can either:

- **Commit `content/` to the repo** — simplest, CI just builds. Recommended for most cases.
- **Sync from a local path in CI** — only if the source is also accessible to CI (e.g. another repo as a submodule or a sync action).

Most users commit `content/` to the wiki repo (e.g. `dsebastien/ai-wiki-pkm`). Their source vault stays private; the published subset gets committed and re-published on every change.
