---
title: Deploy
nav_order: 7
---

# Deploy

The build output (`public/`) is a plain static site. Any static host works. The two officially-supported targets are GitHub Pages and Cloudflare Pages.

### GitHub Pages (out of the box)

The template ships with `.github/workflows/deploy.yml`. After you push to GitHub:

1. Repo → Settings → Pages → **Source = GitHub Actions**.
2. (Optional) Settings → Variables → Actions → `SITE_URL` = `https://your-domain` so canonical URLs match what's live.
3. Push to `main`. The workflow runs `bun install --frozen-lockfile && bun run build` and deploys.

#### Custom domain (GitHub Pages)

1. Settings → Pages → Custom domain → enter your domain.
2. Set `cname` in `site.config.json` to the same value. Next build will emit `public/CNAME`.
3. DNS: add `CNAME <subdomain>` → `<github-user>.github.io`. For apex domains, use A records to GitHub's IPs.

### Cloudflare Pages

Cloudflare Pages auto-detects most builds. Quick setup:

1. Push the repo to GitHub.
2. Cloudflare Dashboard → Pages → Create project → connect to GitHub → pick the repo.
3. Build settings:
   - **Framework preset**: None
   - **Build command**: `bun install && bun run build`
   - **Build output directory**: `public`
   - **Root directory**: leave blank
4. Environment variables (optional): `SITE_URL=https://your-domain`. Cloudflare's build image ships Bun; if not, set `BUN_VERSION=1.3.14` so the buildpack picks it up.
5. Deploy. Pages → Custom domains → add your domain. Cloudflare handles DNS and SSL.

#### Via `wrangler` (one-shot)

If you'd rather create the project via the CLI:

```sh
bunx wrangler@latest pages project create my-wiki --production-branch main
bun run build
bunx wrangler@latest pages deploy public --project-name my-wiki
```

This skips the GitHub integration — you redeploy manually with `wrangler pages deploy public --project-name my-wiki` after each rebuild. Useful for offline-first workflows or repos that don't push to GitHub.

### Cache / CDN headers

The build writes a plain static tree — no headers config required. If you want fine control on Cloudflare Pages, drop a `static/_headers` file in the repo; the build copies `static/` verbatim into `public/`. Example:

```
/css/*
  Cache-Control: public, max-age=31536000, immutable

/js/*
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=0, must-revalidate
```

### Cloudflare Workers / KV / Functions

Out of scope for the template. The output is plain static HTML/CSS/JS — bring your own edge functions if you want them.

### Other hosts

- **Netlify**: build command `bun install && bun run build`, publish directory `public`. Same as Cloudflare Pages.
- **Vercel**: same.
- **Self-hosted (nginx, Caddy)**: serve `public/` as a static root. No special config beyond HTTPS.

### Local preview

Always test locally before pushing:

```sh
bun run build
bun run serve     # http://localhost:4321
```

The serve script uses `Bun.serve` and reads directly from `public/`. It's not a development server — there's no hot reload. Re-run `bun run build` after each change.
