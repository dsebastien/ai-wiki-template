#!/usr/bin/env bun
// Basic release script: bump version in package.json, commit, tag, push.
//
// Usage:
//   bun scripts/release.ts            # patch bump (default)
//   bun scripts/release.ts patch      # 0.1.0 -> 0.1.1
//   bun scripts/release.ts minor      # 0.1.0 -> 0.2.0
//   bun scripts/release.ts major      # 0.1.0 -> 1.0.0
//   bun scripts/release.ts 1.2.3      # explicit version
//
// Pushes the commit and the tag. Downstream deploys (GitHub Pages, Cloudflare
// Pages connected to the repo) react to the push automatically.

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

// Refuse to release with a dirty tree.
const status = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
if (status.stdout.trim()) {
  console.error('working tree is dirty. Commit or stash before releasing.');
  console.error(status.stdout);
  process.exit(1);
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
