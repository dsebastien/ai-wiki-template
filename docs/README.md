---
title: Overview
nav_order: 1
permalink: /
---

# Overview

Welcome to the official documentation of **ai-wiki-template** — a static-site template for cross-linked markdown wikis.

Point it at an entry note, give it a folder of markdown files, optionally provide a frontmatter filter. The build crawls outward from the entry note through `[[wikilinks]]`, applies the filter, and renders only what's reachable and passes — one HTML page per note, with backlinks, knowledge graph, search, and CTAs.

### What you get

- **One HTML page per note**, with `[[wikilinks]]` resolved across the corpus
- **Backlinks** ("Referenced by") auto-computed
- **Knowledge graph** — canvas-rendered force-directed graph with zoom-aware labels and focus mode
- **Client-side search** — prebuilt Lunr index, `/` to open
- **Per-article TOC** + reading time
- **5 swappable themes** (`knowii`, `paper`, `terminal`, `moss`, `stark`), each with light + dark modes
- **Configurable CTAs** — static array or dynamic fetch from a public product catalog at build time
- **Tailwind v4** styling via `@apply` over theme tokens — easy to customize
- **Bun**-powered build (sub-100ms incremental, ~5s cold)
- **GitHub Pages + Cloudflare Pages** deploy out of the box

### Determinism contract

A note is published iff:
- It's reachable via `[[wikilinks]]` from the entry note (or is the entry note itself), AND
- It passes the frontmatter `filter` (default: `{ "public_note": true }`).

The build is fully deterministic — same inputs, same output. No LLM rewriting. Dataview comment blocks are stripped. Wikilinks to notes outside the discovered corpus render as visible-but-unlinked dashed text.

### Use cases

- Personal knowledge management wikis (the canonical case)
- Internal team handbooks built from an Obsidian vault
- Public reference sites for any cross-linked markdown corpus
- Documentation portals where authors prefer wikilinks over relative paths

### Next steps

- [Getting started](getting-started.md) — install, configure, build, preview in 60 seconds
- [Configuration reference](configuration.md) — every field in `site.config.json`
- [Content](content.md) — frontmatter, wikilinks, entry note, filtering
- [Themes](themes.md) — the 5 built-in themes + how to add your own
- [CTAs](ctas.md) — static and dynamic call-to-action cards
- [Deploy](deploy.md) — GitHub Pages, Cloudflare Pages, custom domain
- [Customizing](customizing.md) — tokens, components, templates
- [Troubleshooting](troubleshooting.md) — common errors and fixes

### License

MIT. Content licensing depends on your source notes.
