import { invoke } from '@tauri-apps/api/core';
import { exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import type { Positions } from '@/lib/webmscore/types';
import {
  FULL_SCORE_PART_ID,
  type BakeResult,
  type ChartIndex,
  type ChartManifest,
} from '@/interfaces/baked-chart';

// ── Keys & relative paths (shared by host disk and follower URLs) ────────────

/** Make a song name safe for both filesystem paths and URL segments. */
export function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'song';
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

// Bump whenever the bake output shape or logic changes, so previously-cached
// bakes (keyed only by source bytes) are invalidated and regenerated.
const BAKE_VERSION = 16;

/** Stable per-source key: sanitized name + short content hash + bake version. */
export async function computeSongKey(songName: string, msczBytes: Uint8Array): Promise<string> {
  const hash = (await sha256Hex(msczBytes)).slice(0, 8);
  return `${sanitizeName(songName)}-${hash}-v${BAKE_VERSION}`;
}

function partDirName(id: number): string {
  return id === FULL_SCORE_PART_ID ? 'full' : `part-${id}`;
}

/** Relative path (under a songKey dir) of a part's Nth SVG page. */
function pageRel(id: number, page: number): string {
  return `${partDirName(id)}/p${page}.svg`;
}
function positionsRel(id: number): string {
  return `${partDirName(id)}/positions.json`;
}
const MANIFEST_REL = 'manifest.json';
const MUSICXML_REL = 'full.musicxml';
const INDEX_FILE = 'index.json';

// ── Host: disk-backed cache under the app-data chart-cache dir ───────────────

let cacheBaseDirPromise: Promise<string> | null = null;

/** Absolute app-data chart-cache dir. Matches what the Rust band server serves at /charts. */
export function getCacheBaseDir(): Promise<string> {
  if (!cacheBaseDirPromise) {
    cacheBaseDirPromise = invoke<string>('get_chart_cache_dir');
  }
  return cacheBaseDirPromise;
}

async function songDir(songKey: string): Promise<string> {
  return `${await getCacheBaseDir()}/${songKey}`;
}

export async function readCachedManifest(songKey: string): Promise<ChartManifest | null> {
  const path = `${await songDir(songKey)}/${MANIFEST_REL}`;
  if (!(await exists(path))) return null;
  try {
    return JSON.parse(await readTextFile(path)) as ChartManifest;
  } catch {
    return null; // corrupt/partial cache — treat as a miss so we rebake
  }
}

export async function readCachedPages(songKey: string, part: { id: number; pages: number }): Promise<string[]> {
  const dir = await songDir(songKey);
  const pages: string[] = [];
  for (let p = 0; p < part.pages; p++) {
    pages.push(await readTextFile(`${dir}/${pageRel(part.id, p)}`));
  }
  return pages;
}

export async function readCachedPositions(songKey: string, id: number): Promise<Positions> {
  const dir = await songDir(songKey);
  return JSON.parse(await readTextFile(`${dir}/${positionsRel(id)}`)) as Positions;
}

export async function readCachedMusicXml(songKey: string): Promise<string> {
  return readTextFile(`${await songDir(songKey)}/${MUSICXML_REL}`);
}

/** Write a fresh bake to disk and return the manifest that describes it. */
export async function writeBake(
  songKey: string,
  songName: string,
  sourceHash: string,
  result: BakeResult,
): Promise<ChartManifest> {
  const dir = await songDir(songKey);

  const manifest: ChartManifest = {
    songKey,
    songName,
    sourceHash,
    parts: result.parts.map((p) => ({
      id: p.id,
      name: p.name,
      pages: p.pages.length,
      pageSize: p.positions.pageSize,
    })),
  };

  for (const part of result.parts) {
    await mkdir(`${dir}/${partDirName(part.id)}`, { recursive: true });
    for (let p = 0; p < part.pages.length; p++) {
      await writeTextFile(`${dir}/${pageRel(part.id, p)}`, part.pages[p]);
    }
    await writeTextFile(`${dir}/${positionsRel(part.id)}`, JSON.stringify(part.positions));
  }

  await writeTextFile(`${dir}/${MUSICXML_REL}`, result.musicXml);
  // Write the manifest last so its presence means "cache is complete".
  await writeTextFile(`${dir}/${MANIFEST_REL}`, JSON.stringify(manifest));

  await updateIndex(songName, songKey);
  return manifest;
}

/** Maintain index.json (songName -> songKey) so followers can resolve any baked song. */
async function updateIndex(songName: string, songKey: string): Promise<void> {
  const path = `${await getCacheBaseDir()}/${INDEX_FILE}`;
  let index: ChartIndex = {};
  if (await exists(path)) {
    try {
      index = JSON.parse(await readTextFile(path)) as ChartIndex;
    } catch {
      index = {};
    }
  }
  index[songName] = songKey;
  await writeTextFile(path, JSON.stringify(index));
}

// ── Follower: fetch baked assets over the LAN server (/charts) ───────────────

function chartUrl(...segments: string[]): string {
  return `/charts/${segments.join('/')}`;
}

export async function fetchIndex(): Promise<ChartIndex> {
  // no-store: the index changes as the host bakes more songs during a session.
  const res = await fetch(chartUrl(INDEX_FILE), { cache: 'no-store' });
  if (!res.ok) throw new Error(`chart index fetch failed: ${res.status}`);
  return (await res.json()) as ChartIndex;
}

export async function fetchManifest(songKey: string): Promise<ChartManifest> {
  const res = await fetch(chartUrl(songKey, MANIFEST_REL));
  if (!res.ok) throw new Error(`manifest fetch failed: ${res.status}`);
  return (await res.json()) as ChartManifest;
}

export async function fetchPages(songKey: string, part: { id: number; pages: number }): Promise<string[]> {
  const pages: string[] = [];
  for (let p = 0; p < part.pages; p++) {
    const res = await fetch(chartUrl(songKey, pageRel(part.id, p)));
    if (!res.ok) throw new Error(`page fetch failed: ${res.status}`);
    pages.push(await res.text());
  }
  return pages;
}

export async function fetchPositions(songKey: string, id: number): Promise<Positions> {
  const res = await fetch(chartUrl(songKey, positionsRel(id)));
  if (!res.ok) throw new Error(`positions fetch failed: ${res.status}`);
  return (await res.json()) as Positions;
}

export async function fetchMusicXml(songKey: string): Promise<string> {
  const res = await fetch(chartUrl(songKey, MUSICXML_REL));
  if (!res.ok) throw new Error(`musicxml fetch failed: ${res.status}`);
  return res.text();
}
