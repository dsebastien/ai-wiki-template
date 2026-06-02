---
title: Themes
nav_order: 5
---

# Themes

Set `"theme": "<name>"` in `site.config.json`. The build copies the matching theme file from `src/styles/themes/` to `src/styles/active-theme.css` at build time. Tailwind then compiles everything into `public/css/style.css`.

### Built-in themes

| Theme | Vibe | Default mode | Fonts |
|---|---|---|---|
| `knowii` | Cool slate background + hot pink accent | dark | Noto Sans |
| `paper` | Warm off-white + dark ink + serif display | light | Fraunces + Inter |
| `terminal` | Phosphor green on black + monospace | dark | JetBrains Mono |
| `moss` | Forest green + warm beige + amber accent | dark | Source Serif + Source Sans |
| `stark` | Pure white/black + electric blue | light | Inter |

Each theme defines:

- A "default" block (`:root, :root[data-mode='dark']` OR `:root, :root[data-mode='light']` depending on intended default)
- A counter-mode block for the other mode

The dark/light toggle in the header switches `data-mode` on `<html>`. `site.config.json` → `defaultMode` sets which one new visitors land on. `themeToggle: false` hides the toggle button.

### Anatomy of a theme file

Themes only define **tokens**. Layout and components live in `src/styles/components.css` and consume tokens via Tailwind utilities (e.g. `bg-bg-elev`, `text-ink-soft`). So swapping the theme swaps the look without touching components.

```css
/* src/styles/themes/your-theme.css */
@import url('https://fonts.googleapis.com/css2?family=…&display=swap');

:root,
:root[data-mode='dark'] {
  /* fonts */
  --theme-font-sans: 'Inter', system-ui, sans-serif;
  --theme-font-display: 'Inter', system-ui, sans-serif;
  --theme-font-mono: ui-monospace, monospace;

  /* surfaces */
  --theme-bg: #0e1117;
  --theme-bg-elev: #161b22;
  --theme-bg-elev-2: #1f2530;

  /* ink */
  --theme-ink: #ffffff;
  --theme-ink-soft: rgba(255, 255, 255, 0.7);
  --theme-ink-muted: rgba(255, 255, 255, 0.5);

  /* lines */
  --theme-line: rgba(255, 255, 255, 0.1);
  --theme-line-strong: rgba(255, 255, 255, 0.2);

  /* cards */
  --theme-card-subtle: rgba(255, 255, 255, 0.05);
  --theme-card-subtle-hover: rgba(255, 255, 255, 0.1);

  /* accent */
  --theme-accent: #2563eb;
  --theme-accent-text: #60a5fa;
  --theme-accent-muted: #1e40af;

  /* status */
  --theme-success: #4ade80;
}

:root[data-mode='light'] {
  /* same token names, light-mode values */
  --theme-bg: #ffffff;
  /* … */
}
```

### Adding a theme

1. Create `src/styles/themes/<name>.css` following the structure above. All 15 `--theme-*` tokens are required (or the build will compile with missing values, which looks broken).
2. Optionally `@import url(…)` web fonts at the top. The build extracts these and converts them to `<link rel="stylesheet">` tags in `<head>` so Tailwind doesn't choke on nested `@import`.
3. Set `"theme": "<name>"` in `site.config.json`.
4. `bun run build` — the build prints `theme: <name>` if the file was found.

### Fonts

Themes can pull fonts from any CDN via `@import url('…')`. The build automatically:

- Strips the `@import url(...)` lines from the theme file (Tailwind v4 disallows nested `@import` after the first `@import 'tailwindcss';`)
- Emits them as `<link rel="stylesheet" href="...">` in `<head>` of every generated page

If you want offline / self-hosted fonts, drop them in `static/` and reference them with a `@font-face` block in your theme file instead of `@import url(...)`.

### Tokens reference

These are the tokens every theme must define. They map 1:1 to Tailwind utilities via `@theme inline` in `src/styles/main.css`:

| Token | Tailwind utility | Used for |
|---|---|---|
| `--theme-font-sans` | `font-sans` | Body text |
| `--theme-font-display` | `font-display` | Headlines, hero, card titles |
| `--theme-font-mono` | `font-mono` | Code, kickers, kbd |
| `--theme-bg` | `bg-bg` | Page background |
| `--theme-bg-elev` | `bg-bg-elev` | Cards, panels, header |
| `--theme-bg-elev-2` | `bg-bg-elev-2` | Hover state for elevated surfaces |
| `--theme-ink` | `text-ink` | Primary text |
| `--theme-ink-soft` | `text-ink-soft` | Body prose, descriptions |
| `--theme-ink-muted` | `text-ink-muted` | Captions, kickers, dates |
| `--theme-line` | `border-line` | Default borders, dividers |
| `--theme-line-strong` | `border-line-strong` | Emphasized borders, buttons |
| `--theme-card-subtle` | `bg-card-subtle` | Subtle backgrounds, search results |
| `--theme-card-subtle-hover` | `bg-card-subtle-hover` | Hover state |
| `--theme-accent` | `bg-accent`, `text-accent` | Primary buttons, badges, accents |
| `--theme-accent-text` | `text-accent-text` | Pink text (links, kickers) — typically slightly lighter than `--theme-accent` for contrast on dark surfaces |
| `--theme-accent-muted` | `text-accent-muted` | Subdued accent |
| `--theme-success` | `text-success`, `bg-success` | Success states |

### Re-skinning without forking

If you want a one-off theme for a single site (and don't want to upstream it):

1. Copy any theme as `src/styles/themes/custom.css` in your site repo
2. Edit tokens
3. Set `"theme": "custom"` in `site.config.json`

When you later pull updates from `dsebastien/ai-wiki-template`, your custom theme stays — only the built-in five themes get refreshed.
