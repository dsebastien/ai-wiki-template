---
title: Getting started
nav_order: 2
---

# Getting started

From zero to a published wiki in about 60 seconds.

### 1. Create your repo

Click **Use this template** on the [ai-wiki-template](https://github.com/dsebastien/ai-wiki-template) repo, OR:

```sh
gh repo create my-wiki --template dsebastien/ai-wiki-template --public --clone
cd my-wiki
```

### 2. Install dependencies

You need [Bun](https://bun.sh) v1.1+:

```sh
bun install
```

### 3. First build

The template ships with example content (`content/Welcome.md` + `content/Another Article.md`) so you can build immediately:

```sh
bun run build    # → public/
bun run serve    # → http://localhost:4321
```

### 4. Configure your site

Open `site.config.json` and edit at least:

```jsonc
{
  "siteTitle": "My Wiki",
  "siteTagline": "A living reference.",
  "siteUrl": "https://my-wiki.example.com",
  "author": "Your Name",
  "authorUrl": "https://you.example.com",
  "entryNote": "content/Welcome.md",
  "theme": "default",
  "heroHeadline": "My Wiki",
  "heroEyebrow": "Living reference"
}
```

See the [configuration reference](configuration.md) for every field.

### 5. Replace the example content

Drop your own markdown into `content/`. The build crawls from the file at `entryNote` outward through `[[wikilinks]]`. Any note with frontmatter `public_note: true` (the default filter) and reachable from the entry note is published.

Two options for getting content into `content/`:

- **Commit directly** — copy your notes once, commit them. Simplest for one-off publishing.
- **Sync from another folder** — set `contentSource` in `site.config.json` and run `bun run sync` before each build. Best when your notes live in another tool (Obsidian vault, another repo).

See [content](content.md) for frontmatter conventions, wikilink resolution, and the entry-note model.

### 6. Deploy

Push to GitHub. The bundled workflow at `.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every push to `main`.

```sh
git add . && git commit -m "feat: initial wiki" && git push
```

Then: Settings → Pages → Source = **GitHub Actions**.

See [deploy](deploy.md) for GitHub Pages, Cloudflare Pages, and custom domain setup.

### Daily workflow

```sh
bun run dev      # sync + build + serve, all-in-one
```

Or step by step:

```sh
bun run sync     # vault → content/  (only if contentSource is set)
bun run build    # render public/
bun run serve    # local preview on http://localhost:4321
```

When you're happy: `git add content && git commit -m "wiki: refresh" && git push`. CI rebuilds.

### What's next

- [Configuration](configuration.md) — every field in `site.config.json`
- [Content](content.md) — how notes get included or excluded
- [Themes](themes.md) — pick a look or build your own
