// Copies webmscore's runtime dist files out of node_modules into public/webmscore
// so they are served same-origin (at /webmscore/...) by both Vite dev and the
// Tauri/band-server bundle. webmscore's bundler support is "TBD" upstream and its
// UMD loader fetches its own .wasm/.data relative to itself, so vendoring the flat
// dist is far more reliable than routing a 9 MB WASM through Vite's module graph.
//
// Runs automatically via the predev/prebuild npm hooks. Idempotent.

import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'node_modules', 'webmscore');
const destDir = join(root, 'public', 'webmscore');

// The UMD entry (webmscore.js) plus the emscripten assets it loads at runtime.
const FILES = [
  'webmscore.js',
  'webmscore.lib.js',
  'webmscore.lib.wasm',
  'webmscore.lib.mem.wasm',
  'webmscore.lib.data',
];

if (!existsSync(srcDir)) {
  console.warn('[copy-webmscore] node_modules/webmscore not found — run `npm install` first. Skipping.');
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });

let copied = 0;
for (const file of FILES) {
  const from = join(srcDir, file);
  if (!existsSync(from)) continue; // optional assets (e.g. .data) may be absent
  cpSync(from, join(destDir, file));
  copied++;
}

console.log(`[copy-webmscore] copied ${copied} file(s) to public/webmscore`);
