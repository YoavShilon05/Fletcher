// Minimal subset of webmscore's type surface that Fletcher actually uses.
// Mirrors webmscore@1.2.1 `schemas.ts`. Hand-declared (rather than imported from
// the package) so nothing depends on the package's runtime being bundled — we
// load webmscore's UMD build at runtime, see ./loader.ts.

export interface ScorePartData {
  name: string;
  instrumentName: string;
  isVisible: 'true' | 'false';
}

export interface ScoreExcerptData {
  /** excerpt id — pass to setExcerptId() */
  id: number;
  title: string;
  parts: ScorePartData[];
}

export interface ScoreMetadata {
  title: string;
  pages: number;
  measures: number;
  duration: number;
  excerpts: ScoreExcerptData[];
  parts: ScorePartData[];
}

/** One measure's bounding box, in pixels of the exported SVG. */
export interface PositionElement {
  id: number;
  /** x of the element's top-left, from the page's top-left */
  x: number;
  /** y of the element's top-left, from the page's top-left */
  y: number;
  /** element width */
  sx: number;
  /** element height */
  sy: number;
  /** zero-based page index the element sits on */
  page: number;
}

export interface PositionEvent {
  elid: number;
  /** time offset (ms) of the element in the exported audio */
  position: number;
}

export interface Positions {
  elements: PositionElement[];
  events: PositionEvent[];
  pageSize: { height: number; width: number };
}

export type InputFileFormat =
  | 'mscz' | 'mscx' | 'mxl' | 'musicxml' | 'xml' | 'midi';

/** The runtime instance returned by WebMscore.load(). Methods are all async. */
export interface WebMscoreInstance {
  setExcerptId(id: number): Promise<void>;
  generateExcerpts(): Promise<void>;
  title(): Promise<string>;
  npages(): Promise<number>;
  metadata(): Promise<ScoreMetadata>;
  measurePositions(): Promise<Positions>;
  saveXml(): Promise<string>;
  /** Save the current excerpt (part) as a standalone MSCZ/MSCX. */
  saveMsc(format?: 'mscz' | 'mscx'): Promise<Uint8Array>;
  saveSvg(pageNumber?: number, drawPageBackground?: boolean): Promise<string>;
  destroy(soft?: boolean): void;
}

export interface WebMscoreStatic {
  readonly ready: Promise<void>;
  load(
    format: InputFileFormat,
    data: Uint8Array,
    fonts?: Uint8Array[],
    doLayout?: boolean,
  ): Promise<WebMscoreInstance>;
}
