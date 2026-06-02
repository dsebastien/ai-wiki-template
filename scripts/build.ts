#!/usr/bin/env bun
// Static site generator. Vault-agnostic.
//
// Discovery model: start from `entryNote`, follow [[wikilinks]] to discover the
// corpus, apply optional frontmatter `filter`, build only what's reachable and
// passes the filter. Maximum determinism — the entry note + filter define the
// site exactly.
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import matter from 'gray-matter';
import { Marked } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import lunr from 'lunr';

// ---------- config ----------

const ROOT = process.cwd();
const CFG_PATH = join(ROOT, 'site.config.json');
if (!existsSync(CFG_PATH)) {
  console.error('missing site.config.json');
  process.exit(1);
}
const CFG = JSON.parse(readFileSync(CFG_PATH, 'utf8'));

const SRC_DIR = join(ROOT, 'src');
const TPL_DIR = join(SRC_DIR, 'templates');
const STYLES_DIR = join(SRC_DIR, 'styles');
const THEMES_DIR = join(STYLES_DIR, 'themes');
const CLIENT_DIR = join(SRC_DIR, 'client');
const OUT = join(ROOT, 'public');
const STATIC_DIR = join(ROOT, 'static');

const BUILT_AT = new Date().toISOString();
const SITE_URL = process.env.SITE_URL || CFG.siteUrl || '';

// Entry note + content dir.
if (!CFG.entryNote) {
  console.error(
    'missing site.config.json -> entryNote (path to the markdown root, relative to repo root or absolute)',
  );
  process.exit(1);
}
const ENTRY_NOTE = isAbsolute(CFG.entryNote)
  ? CFG.entryNote
  : resolve(ROOT, CFG.entryNote);
if (!existsSync(ENTRY_NOTE)) {
  console.error(`entryNote not found: ${ENTRY_NOTE}`);
  process.exit(1);
}
const CONTENT_DIR = CFG.contentDir
  ? isAbsolute(CFG.contentDir)
    ? CFG.contentDir
    : resolve(ROOT, CFG.contentDir)
  : dirname(ENTRY_NOTE);

const FILTER: Record<string, unknown> = CFG.filter || {};
const TITLE_PREFIX: string = CFG.titlePrefix || '';
const THEME = (CFG.theme as string) || 'default';
const DEFAULT_MODE = (CFG.defaultMode as string) === 'light' ? 'light' : 'dark';
const THEME_TOGGLE = CFG.themeToggle !== false;

// ---------- helpers ----------

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const escapeHtml = (s: string) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const stripPrefix = (s: string) =>
  TITLE_PREFIX && s.startsWith(TITLE_PREFIX) ? s.slice(TITLE_PREFIX.length) : s;

const readTpl = (name: string) => readFileSync(join(TPL_DIR, name), 'utf8');

const render = (tpl: string, vars: Record<string, unknown>) =>
  tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) =>
    vars[k] === undefined ? '' : String(vars[k]),
  );

const readingTime = (text: string) =>
  Math.max(1, Math.round((text.match(/\b\w+\b/g) || []).length / 220));

const passesFilter = (fm: Record<string, unknown>) => {
  for (const [key, expected] of Object.entries(FILTER)) {
    if (fm[key] !== expected) return false;
  }
  return true;
};

// ---------- pre-build: activate theme ----------

const themeFile = join(THEMES_DIR, `${THEME}.css`);
if (!existsSync(themeFile)) {
  console.error(`unknown theme: ${THEME} (themes: ${readdirSync(THEMES_DIR).join(', ')})`);
  process.exit(1);
}
const themeRaw = readFileSync(themeFile, 'utf8');
const fontImports: string[] = [];
const themeStripped = themeRaw.replace(
  /@import\s+url\(\s*['"]([^'"]+)['"]\s*\)\s*;/g,
  (_, url) => {
    fontImports.push(url);
    return '';
  },
);
writeFileSync(join(STYLES_DIR, 'active-theme.css'), themeStripped);
const fontLinksHtml = fontImports
  .map((u) => `<link rel="stylesheet" href="${u}" />`)
  .join('\n  ');
console.log(`theme: ${THEME}${fontImports.length ? ` (${fontImports.length} font url(s))` : ''}`);

// ---------- favicon discovery (before page rendering) ----------

const faviconCandidates: { file: string; mime: string; path: string }[] = [
  { file: 'favicon.svg', mime: 'image/svg+xml', path: join(SRC_DIR, 'assets', 'favicon.svg') },
  { file: 'favicon.png', mime: 'image/png',     path: join(SRC_DIR, 'assets', 'favicon.png') },
  { file: 'favicon.ico', mime: 'image/x-icon',  path: join(SRC_DIR, 'assets', 'favicon.ico') },
];
const faviconLinksHtml = faviconCandidates
  .filter((c) => existsSync(c.path))
  .map((c) => `<link rel="icon" type="${c.mime}" href="/${c.file}" />`)
  .join('\n  ');

// ---------- corpus discovery ----------

console.log(`entry: ${ENTRY_NOTE}`);
console.log(`content dir: ${CONTENT_DIR}`);
console.log(`filter: ${Object.keys(FILTER).length ? JSON.stringify(FILTER) : '(none)'}`);

// Map every markdown file in CONTENT_DIR by basename (without .md) and full name.
type FileRef = { path: string; baseName: string };
const allMd = new Map<string, FileRef>();
const walkContent = (dir: string) => {
  for (const entry of readdirSync(dir)) {
    const fp = join(dir, entry);
    const st = statSync(fp);
    if (st.isDirectory()) {
      walkContent(fp);
    } else if (entry.endsWith('.md')) {
      const baseName = entry.replace(/\.md$/, '');
      const ref = { path: fp, baseName };
      allMd.set(baseName, ref);
      // Also index without the title prefix, so [[Foo]] resolves to "AI Wiki - X - Foo".
      const stripped = stripPrefix(baseName);
      if (stripped !== baseName) allMd.set(stripped, ref);
    }
  }
};
walkContent(CONTENT_DIR);

type Doc = {
  filePath: string;
  baseName: string;
  displayTitle: string;
  slug: string;
  fm: Record<string, any>;
  content: string;
  isSource: boolean;
};

const docs = new Map<string, Doc>(); // by slug
const baseNameToDoc = new Map<string, Doc>(); // by basename + alias

const loadDoc = (ref: FileRef): Doc | null => {
  const raw = readFileSync(ref.path, 'utf8');
  const { data: fm, content } = matter(raw);
  if (!passesFilter(fm)) return null;
  const displayTitle = stripPrefix(ref.baseName);
  const slug = slugify(displayTitle);
  const isSource = fm.wiki_role === 'source_summary' || fm.source === true;
  return {
    filePath: ref.path,
    baseName: ref.baseName,
    displayTitle,
    slug,
    fm,
    content,
    isSource,
  };
};

// Seed the queue with the entry note.
const entryBase = basename(ENTRY_NOTE).replace(/\.md$/, '');
const entryRef = allMd.get(entryBase) || { path: ENTRY_NOTE, baseName: entryBase };
const entryDoc = loadDoc(entryRef);
if (!entryDoc) {
  console.error(
    `entry note does not pass filter: ${ENTRY_NOTE}\n` +
      `Either relax the filter or update the entry note's frontmatter.`,
  );
  process.exit(1);
}

// BFS over wikilinks.
const linkRe = /\[\[([^\]\n]+?)\]\]/g;
const queue: Doc[] = [entryDoc];
docs.set(entryDoc.slug, entryDoc);
baseNameToDoc.set(entryDoc.baseName, entryDoc);
baseNameToDoc.set(entryDoc.displayTitle, entryDoc);

while (queue.length) {
  const d = queue.shift()!;
  for (const m of d.content.matchAll(linkRe)) {
    const target = m[1].split('|')[0].trim();
    if (baseNameToDoc.has(target)) continue;
    const ref = allMd.get(target);
    if (!ref) continue; // dangling — will render as missing
    const next = loadDoc(ref);
    if (!next) continue; // filtered out
    if (docs.has(next.slug)) continue; // already included via alias
    docs.set(next.slug, next);
    baseNameToDoc.set(next.baseName, next);
    baseNameToDoc.set(next.displayTitle, next);
    queue.push(next);
  }
}

console.log(`discovered ${docs.size} docs`);

// ---------- markdown transforms ----------

const stripDataview = (md: string) =>
  md
    .replace(/<!--\s*QueryToSerialize:[\s\S]*?-->/g, '')
    .replace(/<!--\s*SerializedQuery:[\s\S]*?-->/g, '')
    .replace(/<!--\s*SerializedQuery END\s*-->/g, '');

const resolveWikilinks = (md: string, currentSlug: string) =>
  md.replace(linkRe, (_, body: string) => {
    const [target, alias] = body.split('|').map((s) => s.trim());
    const display = alias || stripPrefix(target);
    const found = baseNameToDoc.get(target);
    if (!found) {
      return `<a class="wikilink wikilink--missing" title="not yet published">${escapeHtml(display)}</a>`;
    }
    if (found.slug === currentSlug) {
      return `<span class="wikilink wikilink--self">${escapeHtml(display)}</span>`;
    }
    return `<a class="wikilink" href="/${found.slug}.html">${escapeHtml(display)}</a>`;
  });

const stripFirstH1 = (md: string) => md.replace(/^\s*#\s+.+\n+/, '');

const makeMarked = () => {
  const m = new Marked({ gfm: true, breaks: false });
  m.use(gfmHeadingId());
  return m;
};

const extractToc = (html: string) => {
  const toc: { level: number; id: string; text: string }[] = [];
  const re = /<h([23])\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;
  let m;
  while ((m = re.exec(html))) {
    toc.push({
      level: Number(m[1]),
      id: m[2],
      text: m[3].replace(/<[^>]+>/g, '').trim(),
    });
  }
  return toc;
};

// ---------- adjacency ----------

const outgoing = new Map<string, Set<string>>();
for (const d of docs.values()) {
  const targets = new Set<string>();
  for (const m of d.content.matchAll(linkRe)) {
    const target = m[1].split('|')[0].trim();
    const found = baseNameToDoc.get(target);
    if (found && found.slug !== d.slug) targets.add(found.slug);
  }
  outgoing.set(d.slug, targets);
}
const incoming = new Map<string, Set<string>>();
for (const [from, tos] of outgoing) {
  for (const to of tos) {
    if (!incoming.has(to)) incoming.set(to, new Set());
    incoming.get(to)!.add(from);
  }
}

// ---------- hero CTA ----------

const ctaHeroHtml = (() => {
  const c = CFG.ctaHero;
  if (!c) return '';
  const second = c.secondary
    ? `<a class="btn btn--ghost" href="${escapeHtml(c.secondary.href)}">${escapeHtml(c.secondary.label)}</a>`
    : '';
  return `<a class="btn btn--primary" href="${escapeHtml(c.href)}">${escapeHtml(c.label)} →</a>${second}`;
})();

// ---------- shell ----------

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, 'css'), { recursive: true });
mkdirSync(join(OUT, 'js'), { recursive: true });

const baseTpl = readTpl('base.html');
const articleTpl = readTpl('article.html');
const indexTpl = readTpl('index.html');
const browseTpl = readTpl('browse.html');
const graphTpl = readTpl('graph.html');

const modeToggleHtml = THEME_TOGGLE
  ? `<button id="mode-toggle" class="icon-btn" aria-label="Toggle light/dark">
       <svg class="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
       <svg class="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>
     </button>`
  : '';

const footerAuthor = CFG.author
  ? `<p>Curated by <a href="${escapeHtml(CFG.authorUrl || '#')}">${escapeHtml(CFG.author)}</a>.</p>
     <p class="muted">© ${new Date().getFullYear()} ${
       CFG.brandName ? `· <a href="${escapeHtml(CFG.brandUrl || '#')}">${escapeHtml(CFG.brandName)}</a>` : ''
     }</p>`
  : `<p class="muted">© ${new Date().getFullYear()}</p>`;

const renderShell = (opts: {
  title: string;
  description: string;
  canonical: string;
  body: string;
  body_class: string;
}) =>
  render(baseTpl, {
    title: opts.title,
    description: opts.description,
    canonical: opts.canonical,
    body: opts.body,
    body_class: opts.body_class,
    site_title: CFG.siteTitle,
    default_mode: DEFAULT_MODE,
    mode_toggle_html: modeToggleHtml,
    footer_author_html: footerAuthor,
    font_links_html: fontLinksHtml,
    favicon_links_html: faviconLinksHtml,
    built_at: BUILT_AT,
  });

// ---------- articles ----------

const searchEntries: { id: string; title: string; body: string; kind: string }[] = [];

const renderArticle = (d: Doc) => {
  const md = stripFirstH1(stripDataview(d.content));
  const withLinks = resolveWikilinks(md, d.slug);
  const html = makeMarked().parse(withLinks) as string;
  const toc = extractToc(html);

  const backlinks = [...(incoming.get(d.slug) || [])]
    .map((s) => docs.get(s))
    .filter(Boolean)
    .sort((a, b) => a!.displayTitle.localeCompare(b!.displayTitle));

  const tocHtml = toc.length
    ? `<nav class="toc" aria-label="On this page"><div class="toc__label">On this page</div><ul>${toc
        .map(
          (t) =>
            `<li class="toc__l${t.level}"><a href="#${t.id}">${escapeHtml(t.text)}</a></li>`,
        )
        .join('')}</ul></nav>`
    : '';

  const backlinksHtml = backlinks.length
    ? `<aside class="backlinks"><h2>Referenced by</h2><ul>${backlinks
        .map(
          (b) =>
            `<li><a href="/${b!.slug}.html">${escapeHtml(b!.displayTitle)}</a></li>`,
        )
        .join('')}</ul></aside>`
    : '';

  const meta = `<span class="meta__rt">${readingTime(d.content)} min read</span>`;

  const body = render(articleTpl, {
    title: escapeHtml(d.displayTitle),
    meta_html: meta,
    toc_html: tocHtml,
    content_html: html,
    backlinks_html: backlinksHtml,
  });

  const description =
    d.content
      .replace(/[#*`\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180) + '…';

  writeFileSync(
    join(OUT, `${d.slug}.html`),
    renderShell({
      title: `${escapeHtml(d.displayTitle)} — ${CFG.siteTitle}`,
      description: escapeHtml(description),
      canonical: `${SITE_URL}/${d.slug}.html`,
      body,
      body_class: 'page page--article',
    }),
  );

  const plain = withLinks
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*`>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  searchEntries.push({
    id: d.slug,
    title: d.displayTitle,
    body: plain.slice(0, 4000),
    kind: d.isSource ? 'source' : 'article',
  });
};

// Render all docs EXCEPT the entry note (it becomes the homepage).
for (const d of docs.values()) {
  if (d.slug === entryDoc.slug) continue;
  renderArticle(d);
}

// ---------- home / browse ----------

const everyDoc = [...docs.values()];
const articles = everyDoc.filter((d) => !d.isSource && d.slug !== entryDoc.slug)
  .sort((a, b) => a.displayTitle.localeCompare(b.displayTitle));
const sources = everyDoc.filter((d) => d.isSource)
  .sort((a, b) => a.displayTitle.localeCompare(b.displayTitle));

const featured = (CFG.featured || [])
  .map((s: string) => docs.get(s))
  .filter(Boolean) as Doc[];

const featuredHtml = featured.length
  ? `
<section class="container-wiki section">
  <header class="section__header">
    <h2>Featured</h2>
    <p class="muted">Good entry points if you're new here.</p>
  </header>
  <div class="cards">
    ${featured
      .map(
        (d) => `
      <a class="card" href="/${d.slug}.html">
        <h3>${escapeHtml(d.displayTitle)}</h3>
        <p>${escapeHtml(
          d.content
            .replace(/^---[\s\S]+?---/, '')
            .replace(/^\s*#\s+.+\n+/, '')
            .replace(/[#*`>\[\]]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 160),
        )}…</p>
      </a>`,
      )
      .join('')}
  </div>
</section>`
  : '';

writeFileSync(
  join(OUT, 'index.html'),
  renderShell({
    title: `${CFG.siteTitle} — ${(CFG.siteTagline || '').split('—')[0].trim()}`,
    description: escapeHtml(CFG.siteTagline || ''),
    canonical: SITE_URL || '/',
    body: render(indexTpl, {
      eyebrow: escapeHtml(CFG.heroEyebrow || 'Living reference'),
      headline: escapeHtml(CFG.heroHeadline || CFG.siteTitle),
      tagline: escapeHtml(CFG.siteTagline || ''),
      article_count: articles.length,
      source_count: sources.length,
      cta_hero_html: ctaHeroHtml,
      featured_html: featuredHtml,
    }),
    body_class: 'page page--home',
  }),
);

const groups = new Map<string, Doc[]>();
for (const a of articles) {
  const letter = a.displayTitle[0].toUpperCase();
  const key = /[A-Z]/.test(letter) ? letter : '#';
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key)!.push(a);
}
const groupKeys = [...groups.keys()].sort();

const browseHtml = `
<section class="browse">
  <div class="browse__jump">
    ${groupKeys.map((k) => `<a href="#letter-${k}">${k}</a>`).join('')}
    ${sources.length ? `<a href="#sources" class="browse__jump--accent">Sources</a>` : ''}
  </div>
  ${groupKeys
    .map(
      (k) => `
    <section class="browse__group" id="letter-${k}">
      <h2 class="browse__letter">${k}</h2>
      <ul class="browse__list">
        ${groups
          .get(k)!
          .map(
            (a) =>
              `<li><a href="/${a.slug}.html">${escapeHtml(a.displayTitle)}</a></li>`,
          )
          .join('')}
      </ul>
    </section>`,
    )
    .join('')}
  ${
    sources.length
      ? `
  <section class="browse__group" id="sources">
    <h2 class="browse__letter">Sources</h2>
    <ul class="browse__list">
      ${sources
        .map(
          (s) =>
            `<li><a href="/${s.slug}.html">${escapeHtml(s.displayTitle)}</a></li>`,
        )
        .join('')}
    </ul>
  </section>`
      : ''
  }
</section>`;

writeFileSync(
  join(OUT, 'browse.html'),
  renderShell({
    title: `Browse all articles — ${CFG.siteTitle}`,
    description: `Browse all ${articles.length} articles and ${sources.length} source summaries.`,
    canonical: `${SITE_URL}/browse.html`,
    body: render(browseTpl, {
      browse_html: browseHtml,
      article_count: articles.length,
      source_count: sources.length,
    }),
    body_class: 'page page--browse',
  }),
);

// ---------- graph.json + graph page ----------

const visibleSlugs = new Set(everyDoc.filter((d) => d.slug !== entryDoc.slug).map((d) => d.slug));
const slugMeta = new Map(
  everyDoc.map((d) => [
    d.slug,
    { title: d.displayTitle, kind: d.isSource ? 'source' : 'article' },
  ]),
);

const edges: { s: string; t: string }[] = [];
for (const [from, tos] of outgoing) {
  if (!visibleSlugs.has(from)) continue;
  for (const to of tos) {
    if (!visibleSlugs.has(to)) continue;
    edges.push({ s: from, t: to });
  }
}

const degree = new Map<string, number>();
for (const e of edges) {
  degree.set(e.s, (degree.get(e.s) || 0) + 1);
  degree.set(e.t, (degree.get(e.t) || 0) + 1);
}

const nodes = [...visibleSlugs].map((slug) => ({
  id: slug,
  t: slugMeta.get(slug)!.title,
  k: slugMeta.get(slug)!.kind,
  d: degree.get(slug) || 0,
}));

writeFileSync(join(OUT, 'graph.json'), JSON.stringify({ nodes, edges }));

writeFileSync(
  join(OUT, 'graph.html'),
  renderShell({
    title: `Graph — ${CFG.siteTitle}`,
    description: `Interactive knowledge graph of ${nodes.length} concepts and ${edges.length} links.`,
    canonical: `${SITE_URL}/graph.html`,
    body: render(graphTpl, {
      node_count: nodes.length,
      edge_count: edges.length,
    }),
    body_class: 'page page--graph',
  }),
);

// ---------- search index ----------

console.log('building search index...');
const idx = lunr(function () {
  this.ref('id');
  this.field('title', { boost: 10 });
  this.field('body');
  for (const e of searchEntries) this.add(e);
});

const lookup: Record<string, { title: string; kind: string }> = {};
for (const e of searchEntries) lookup[e.id] = { title: e.title, kind: e.kind };

writeFileSync(join(OUT, 'search-index.json'), JSON.stringify({ index: idx, lookup }));

// ---------- client JS + favicon + static ----------

cpSync(CLIENT_DIR, join(OUT, 'js'), { recursive: true });

for (const c of faviconCandidates) {
  if (existsSync(c.path)) copyFileSync(c.path, join(OUT, c.file));
}

if (existsSync(STATIC_DIR)) cpSync(STATIC_DIR, OUT, { recursive: true });

// ---------- compile Tailwind ----------

console.log('compiling tailwind...');
const tw = spawnSync(
  'bunx',
  [
    '@tailwindcss/cli',
    '-i',
    join(STYLES_DIR, 'main.css'),
    '-o',
    join(OUT, 'css', 'style.css'),
    '--minify',
  ],
  { stdio: 'inherit' },
);
if (tw.status !== 0) {
  console.error('tailwind build failed');
  process.exit(tw.status || 1);
}

// ---------- sitemap, robots, cname ----------

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc></url>
  <url><loc>${SITE_URL}/browse.html</loc></url>
  <url><loc>${SITE_URL}/graph.html</loc></url>
${[...visibleSlugs]
  .map((s) => `  <url><loc>${SITE_URL}/${s}.html</loc></url>`)
  .join('\n')}
</urlset>`;
writeFileSync(join(OUT, 'sitemap.xml'), sitemap);
writeFileSync(
  join(OUT, 'robots.txt'),
  `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`,
);
if (CFG.cname) writeFileSync(join(OUT, 'CNAME'), `${CFG.cname}\n`);

console.log(
  `✓ built ${docs.size} pages · ${nodes.length} nodes · ${edges.length} edges · theme=${THEME} → ${OUT}`,
);
