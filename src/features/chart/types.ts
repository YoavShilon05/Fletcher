import type { Positions } from "@/lib/webmscore/types";

/** One selectable instrument (or the full score). Lives in manifest.json. */
export interface BakedPart {
  /** webmscore excerpt id; FULL_SCORE_PART_ID (-1) is the full score */
  id: number;
  name: string;
  /** number of SVG pages */
  pages: number;
  /** SVG pixel dimensions of a page (all pages of a part share this) */
  pageSize: { width: number; height: number };
}

/**
 * What engraved a chart: the host's installed MuseScore Studio (full fidelity),
 * or the bundled webmscore WASM (a MuseScore 3.6 port) when it isn't installed.
 */
export type ChartRenderer = "musescore" | "webmscore";

/** Small, cheap-to-transfer index of a baked chart. Written as manifest.json. */
export interface ChartManifest {
  /** filesystem/url-safe key: `<sanitized song name>-<short source hash>` */
  songKey: string;
  songName: string;
  /** hash of the source .mscz bytes — changes force a rebake */
  sourceHash: string;
  /** absent on bakes from before MuseScore rendering (always webmscore) */
  renderer?: ChartRenderer;
  parts: BakedPart[];
}

/** Whole-song name -> songKey. Served at /charts/index.json for followers. */
export type ChartIndex = Record<string, string>;

/**
 * A resolved chart plus lazy loaders for its heavy assets. Backed by local disk
 * on the host and by HTTP fetch on followers — callers don't care which.
 */
export interface BakedChart {
  manifest: ChartManifest;
  /** SVG page strings for a part, in page order. Cached after first load. */
  loadPages(partId: number): Promise<string[]>;
  /** Measure position boxes for a part. Cached after first load. */
  loadPositions(partId: number): Promise<Positions>;
  /** Full-score MusicXML (for chord extraction). Cached after first load. */
  loadMusicXml(): Promise<string>;
}
