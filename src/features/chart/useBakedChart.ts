import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { exists, readFile } from "@tauri-apps/plugin-fs";
import { CHART_SOURCE_EXTENSION, CHARTS_FOLDER_NAME } from "@/constants";
import { filePathAtom } from "@/features/live/atoms";
import { band } from "@/lib/osc/live-api";
import { isHost } from "@/lib/osc/transport";
import { getDirname } from "@/lib/path";
import { bakeMscz } from "@/lib/webmscore/bake";
import { FULL_SCORE_PART_ID, type Positions } from "@/lib/webmscore/types";
import { chartReadyTickAtom } from "./atoms";
import type { BakedChart, ChartManifest } from "./types";
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
} from "./cache";

export type BakedChartState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; chart: BakedChart }
  | { status: "missing" }
  | { status: "error"; error: string };

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

function memoResolve(
  key: string,
  resolver: () => Promise<BakedChart | null>,
): Promise<BakedChart | null> {
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
async function resolveHostChart(songName: string, alsPath: string): Promise<BakedChart | null> {
  const path = `${getDirname(alsPath)}/${CHARTS_FOLDER_NAME}/${songName}.${CHART_SOURCE_EXTENSION}`;
  if (!(await exists(path))) return null;

  const bytes = await readFile(path);
  const songKey = await computeSongKey(songName, bytes);

  let manifest = await readCachedManifest(songKey);
  if (!manifest) {
    const result = await bakeMscz(bytes);
    manifest = await writeBake(songKey, songName, songKey, result);
  }

  // Announce every session (cheap, cached server-side) so late-joining followers
  // and followers on this song learn the key even if the bake predates them.
  band.chartReady(songName, songKey);
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
export function useBakedChart(songName: string | undefined): BakedChartState {
  const alsPath = useAtomValue(filePathAtom);
  const tick = useAtomValue(chartReadyTickAtom);

  // Which request the stored result answers. Comparing it with the current
  // request (rather than resetting state in the effect) is what makes a stale
  // result read as 'loading' the moment the song changes.
  const requestKey =
    songName === undefined || (isHost && !alsPath)
      ? undefined
      : isHost
        ? `host::${alsPath}::${songName}`
        : `follower::${songName}::${tick}`;
  const [result, setResult] = useState<{ key: string; state: BakedChartState }>();

  useEffect(() => {
    if (requestKey === undefined || songName === undefined) return;

    let cancelled = false;
    const promise = isHost
      ? memoResolve(requestKey, () => resolveHostChart(songName, alsPath!))
      : memoResolve(requestKey, () => resolveFollowerChart(songName));

    promise
      .then((chart) => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          state: chart ? { status: "ready", chart } : { status: "missing" },
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          state: { status: "error", error: err?.message ?? String(err) },
        });
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, songName, alsPath]);

  if (requestKey === undefined) return { status: "idle" };
  if (result?.key !== requestKey) return { status: "loading" };
  return result.state;
}

/** The persisted part if this chart has it, else the chart's first part (the full score). */
export function resolvePartId(chart: BakedChart, partId: number): number {
  return chart.manifest.parts.some((p) => p.id === partId)
    ? partId
    : (chart.manifest.parts[0]?.id ?? FULL_SCORE_PART_ID);
}

interface PartData {
  pages: string[];
  positions: Positions;
}

/** Load the SVG pages + measure positions for one part of a resolved chart. */
export function useChartPart(chart: BakedChart | undefined, partId: number) {
  const id = chart ? resolvePartId(chart, partId) : undefined;
  const [result, setResult] = useState<{ chart: BakedChart; id: number; data?: PartData }>();

  useEffect(() => {
    if (!chart || id === undefined) return;

    let cancelled = false;
    Promise.all([chart.loadPages(id), chart.loadPositions(id)])
      .then(([pages, positions]) => {
        if (!cancelled) setResult({ chart, id, data: { pages, positions } });
      })
      .catch(() => {
        if (!cancelled) setResult({ chart, id, data: undefined });
      });

    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  // Only hand back data loaded for *this* chart/part, never a previous one's.
  return result?.chart === chart && result?.id === id ? result?.data : undefined;
}

/** Load the full-score MusicXML of a resolved chart (for chord extraction). */
export function useChartMusicXml(chart: BakedChart | undefined) {
  const [result, setResult] = useState<{ chart: BakedChart; xml?: string }>();

  useEffect(() => {
    if (!chart) return;

    let cancelled = false;
    chart
      .loadMusicXml()
      .then((xml) => {
        if (!cancelled) setResult({ chart, xml });
      })
      .catch(() => {
        if (!cancelled) setResult({ chart, xml: undefined });
      });

    return () => {
      cancelled = true;
    };
  }, [chart]);

  return result?.chart === chart ? result?.xml : undefined;
}
