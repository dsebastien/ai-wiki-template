#!/usr/bin/env bun
// Sync markdown files from a source directory into ./content.
// Source resolution order:
//   1. CONTENT_SRC env var (absolute path)
//   2. site.config.json -> contentSource (absolute, or relative to repo root)
//
// The build script does NOT depend on sync. Repos that commit content/
// directly can skip sync entirely.
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

const ROOT = process.cwd();
const CFG = JSON.parse(readFileSync(join(ROOT, 'site.config.json'), 'utf8'));

const rawSrc = process.env.CONTENT_SRC || CFG.contentSource;
if (!rawSrc) {
  console.error(
    'No content source configured.\n' +
      'Set "contentSource" in site.config.json (absolute path, or relative to repo root)\n' +
      'or pass CONTENT_SRC=/abs/path.',
  );
  process.exit(1);
}
const SRC = isAbsolute(rawSrc) ? rawSrc : resolve(ROOT, rawSrc);

if (!existsSync(SRC) || !statSync(SRC).isDirectory()) {
  console.error(`Source not found or not a directory: ${SRC}`);
  process.exit(1);
}

const DST = join(ROOT, 'content');
rmSync(DST, { recursive: true, force: true });
mkdirSync(DST, { recursive: true });

let copied = 0;
const skipPatterns: RegExp[] = (CFG.syncSkipPatterns || []).map(
  (p: string) => new RegExp(p),
);

for (const name of readdirSync(SRC)) {
  if (!name.endsWith('.md')) continue;
  if (skipPatterns.some((re) => re.test(name))) continue;
  cpSync(join(SRC, name), join(DST, name));
  copied++;
}

console.log(`synced ${copied} files from ${SRC} → ${DST}`);
