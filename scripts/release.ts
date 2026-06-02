#!/usr/bin/env bun
// Basic release script: sync content (if configured), bump version in
// package.json, commit, tag, push.
//
// Usage:
//   bun scripts/release.ts            # patch bump (default)
//   bun scripts/release.ts patch      # 0.1.0 -> 0.1.1
//   bun scripts/release.ts minor      # 0.1.0 -> 0.2.0
//   bun scripts/release.ts major      # 0.1.0 -> 1.0.0
//   bun scripts/release.ts 1.2.3      # explicit version
//
// When site.config.json -> contentSource (or CONTENT_SRC) is set, runs `sync`
// first so content/ reflects the latest source notes, then commits any content
// changes separately before bumping the version. Pushes the commit and the
// tag. Downstream deploys (GitHub Pages, Cloudflare Pages connected to the
// repo) react to the push automatically.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const PKG_PATH = join(ROOT, 'package.json');
const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8'));
const current: string = pkg.version || '0.0.0';

const arg = process.argv[2] ?? 'patch';

const parse = (v: string): [number, number, number] => {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) {
    console.error(`invalid semver: ${v}`);
    process.exit(2);
  }
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};

const bump = (v: string, kind: 'major' | 'minor' | 'patch'): string => {
  const [maj, min, pat] = parse(v);
  if (kind === 'major') return `${maj + 1}.0.0`;
  if (kind === 'minor') return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
};

let next: string;
if (arg === 'major' || arg === 'minor' || arg === 'patch') {
  next = bump(current, arg);
} else {
  parse(arg);
  next = arg;
}

const run = (cmd: string, args: string[]): void => {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`failed: ${cmd} ${args.join(' ')}`);
    process.exit(r.status || 1);
  }
};

// Refuse to release with non-content changes pending — those should be a
// deliberate commit, not swept into the release.
const preStatus = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
const nonContentDirty = preStatus.stdout
  .split('\n')
  .filter((l) => l.trim() && !/^.{2} "?content\//.test(l));
if (nonContentDirty.length > 0) {
  console.error('working tree has non-content changes. Commit or stash before releasing.');
  console.error(nonContentDirty.join('\n'));
  process.exit(1);
}

// If a content source is configured, sync and commit any resulting changes.
const cfg = JSON.parse(readFileSync(join(ROOT, 'site.config.json'), 'utf8'));
const hasContentSource = Boolean(process.env.CONTENT_SRC || cfg.contentSource);
if (hasContentSource) {
  run('bun', ['run', 'sync']);
  const postSync = spawnSync('git', ['status', '--porcelain', '--', 'content'], {
    encoding: 'utf8',
  });
  if (postSync.stdout.trim()) {
    run('git', ['add', 'content']);
    run('git', ['commit', '-m', 'content: sync']);
  } else {
    console.log('content/ already up to date.');
  }
} else {
  console.log('no contentSource configured — skipping sync.');
}

pkg.version = next;
writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');

const tag = `v${next}`;
console.log(`releasing ${current} -> ${next} (tag ${tag})`);

run('git', ['add', 'package.json']);
run('git', ['commit', '-m', `release: ${tag}`]);
run('git', ['tag', '-a', tag, '-m', `Release ${tag}`]);
run('git', ['push']);
run('git', ['push', '--tags']);

console.log(`\n✓ released ${tag}`);
