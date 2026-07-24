import { useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';
import { exists, readFile } from '@tauri-apps/plugin-fs';
import { broadcast, isTauri } from '@/hooks/useOsc.ts';
import { chartReadyTickAtom, filePathAtom } from '@/stores/store.ts';
import { getDirname } from '@/utils/get-dirname.ts';
import { CHART_READY_ADDRESS, CHART_SOURCE_EXTENSION, CHARTS_FOLDER_NAME } from '@/constants.ts';
import { Song } from '@/interfaces/song.ts';
import {
  FULL_SCORE_PART_ID,
  type BakedChart,
  type ChartManifest,
} from '@/interfaces/baked-chart.ts';
import type { Positions } from '@/lib/webmscore/types';
import { bakeMscz } from '@/lib/webmscore/bake.ts';
import {
  computeSongKey,
  fetchIndex,
  fetchManifest,
  fetchMusicXml,
  fetchPages,
  fetchPositions,
  readCachedManifest,
  readCachedMusicXml,
  readCachedPages,
  readCachedPositions,
  writeBake,
} from '@/utils/chart-cache.ts';

export type BakedChartState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; chart: BakedChart }
  | { status: 'missing' }
  | { status: 'error'; error: string };

// Asset IO differs by role; the assembled BakedChart hides which one is used.
interface ChartIo {
  pages(songKey: string, part: { id: number; pages: number }): Promise<string[]>;
  positions(songKey: string, id: number): Promise<Positions>;
  musicXml(songKey: string): Promise<string>;
}

const hostIo: ChartIo = {
  pages: readCachedPages,
  positions: readCachedPositions,
  musicXml: readCachedMusicXml,
};

const followerIo: ChartIo = {
  pages: fetchPages,
  positions: fetchPositions,
  musicXml: fetchMusicXml,
};

function makeBakedChart(manifest: ChartManifest, io: ChartIo): BakedChart {
  const pageCache = new Map<number, Promise<string[]>>();
  const posCache = new Map<number, Promise<Positions>>();
  let xmlCache: Promise<string> | null = null;

  return {
    manifest,
    loadPages(partId) {
      let cached = pageCache.get(partId);
      if (!cached) {
        const part = manifest.parts.find((p) => p.id === partId) ?? manifest.parts[0];
        cached = io.pages(manifest.songKey, part);
        pageCache.set(partId, cached);
      }
      return cached;
    },
    loadPositions(partId) {
      let cached = posCache.get(partId);
      if (!cached) {
        cached = io.positions(manifest.songKey, partId);
        posCache.set(partId, cached);
      }
      return cached;
    },
    loadMusicXml() {
      if (!xmlCache) xmlCache = io.musicXml(manifest.songKey);
      return xmlCache;
    },
  };
}

// Module-level memo so ChartView and ChordView (both mounted on the same song)
// share one resolution — and, on the host, one bake — instead of racing.
const resolveCache = new Map<string, Promise<BakedChart | null>>();

function memoResolve(key: string, resolver: () => Promise<BakedChart | null>): Promise<BakedChart | null> {
  let existing = resolveCache.get(key);
  if (!existing) {
    existing = resolver().catch((err) => {
      resolveCache.delete(key); // let a later mount retry after a transient failure
      throw err;
    });
    resolveCache.set(key, existing);
  }
  return existing;
}

// Host: find <alsDir>/charts/<song>.mscz, reuse the disk bake or create it, then
// tell followers it's fetchable.
async function resolveHostChart(song: Song, alsPath: string): Promise<BakedChart | null> {
  const path = `${getDirname(alsPath)}/${CHARTS_FOLDER_NAME}/${song.name}.${CHART_SOURCE_EXTENSION}`;
  if (!(await exists(path))) return null;

  const bytes = await readFile(path);
  const songKey = await computeSongKey(song.name, bytes);

  let manifest = await readCachedManifest(songKey);
  if (!manifest) {
    const result = await bakeMscz(bytes);
    manifest = await writeBake(songKey, song.name, songKey, result);
  }

  // Announce every session (cheap, cached server-side) so late-joining followers
  // and followers on this song learn the key even if the bake predates them.
  broadcast(CHART_READY_ADDRESS, [song.name, songKey]);
  return makeBakedChart(manifest, hostIo);
}

// Follower: look the song up in the host-served index, then fetch its manifest.
async function resolveFollowerChart(songName: string): Promise<BakedChart | null> {
  const index = await fetchIndex();
  const songKey = index[songName];
  if (!songKey) return null;
  const manifest = await fetchManifest(songKey);
  return makeBakedChart(manifest, followerIo);
}

/**
 * Resolve the baked chart for a song. On the host this bakes-on-first-open and
 * caches to disk; on followers it fetches the baked assets over the LAN server.
 */
export function useBakedChart(song: Song | undefined): BakedChartState {
  const alsPath = useAtomValue(filePathAtom);
  const tick = useAtomValue(chartReadyTickAtom);
  const [state, setState] = useState<BakedChartState>({ status: 'idle' });

  useEffect(() => {
    if (!song) {
      setState({ status: 'idle' });
      return;
    }
    if (isTauri && !alsPath) {
      setState({ status: 'idle' });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    const promise = isTauri
      ? memoResolve(`host::${alsPath}::${song.name}`, () => resolveHostChart(song, alsPath!))
      : memoResolve(`follower::${song.name}::${tick}`, () => resolveFollowerChart(song.name));

    promise
      .then((chart) => {
        if (cancelled) return;
        setState(chart ? { status: 'ready', chart } : { status: 'missing' });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: 'error', error: err?.message ?? String(err) });
      });

    return () => {
      cancelled = true;
    };
  }, [song?.name, alsPath, tick]);

  return state;
}

/** Load the SVG pages + measure positions for one part of a resolved chart. */
export function useChartPart(chart: BakedChart | undefined, partId: number) {
  const [data, setData] = useState<{ pages: string[]; positions: Positions }>();

  useEffect(() => {
    if (!chart) {
      setData(undefined);
      return;
    }
    // Fall back to the full score if the persisted part isn't in this chart.
    const has = chart.manifest.parts.some((p) => p.id === partId);
    const id = has ? partId : chart.manifest.parts[0]?.id ?? FULL_SCORE_PART_ID;

    let cancelled = false;
    setData(undefined);
    Promise.all([chart.loadPages(id), chart.loadPositions(id)])
      .then(([pages, positions]) => {
        if (!cancelled) setData({ pages, positions });
      })
      .catch(() => {
        if (!cancelled) setData(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [chart, partId]);

  return data;
}

/** Load the full-score MusicXML of a resolved chart (for chord extraction). */
export function useChartMusicXml(chart: BakedChart | undefined) {
  const [xml, setXml] = useState<string>();

  useEffect(() => {
    if (!chart) {
      setXml(undefined);
      return;
    }
    let cancelled = false;
    chart
      .loadMusicXml()
      .then((x) => {
        if (!cancelled) setXml(x);
      })
      .catch(() => {
        if (!cancelled) setXml(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [chart]);

  return xml;
}
