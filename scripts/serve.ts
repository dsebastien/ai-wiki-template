#!/usr/bin/env bun
// Local preview via Bun.serve.
import { existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const PORT = Number(process.env.PORT) || 4321;
const ROOT = resolve('public');

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

Bun.serve({
  port: PORT,
  fetch(req) {
    let p = decodeURIComponent(new URL(req.url).pathname);
    if (p === '/') p = '/index.html';
    let fp = join(ROOT, p);
    try {
      if (statSync(fp).isDirectory()) fp = join(fp, 'index.html');
      if (!existsSync(fp)) throw new Error('404');
      return new Response(Bun.file(fp), {
        headers: { 'Content-Type': TYPES[extname(fp)] || 'application/octet-stream' },
      });
    } catch {
      return new Response('<h1>404</h1>', {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      });
    }
  },
});

console.log(`http://localhost:${PORT}`);
