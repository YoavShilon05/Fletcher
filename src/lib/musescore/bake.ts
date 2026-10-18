import { invoke } from "@tauri-apps/api/core";
import { XMLParser } from "fast-xml-parser";
import {
  FULL_SCORE_PART_ID,
  type BakeResult,
  type BakedPartData,
  type Positions,
} from "@/lib/webmscore/types";

// Host-side chart rendering through the installed MuseScore Studio (see
// src-tauri/src/musescore.rs). Rust runs the converter and hands back raw
// outputs; this module shapes them into the same BakeResult the webmscore
// renderer produces, so the cache and viewers don't care which engine ran.

interface RawView {
  name: string;
  pages: string[];
  mpos: string;
}

interface RawBake {
  full: RawView;
  parts: RawView[];
  musicXml: string;
}

/** Path of the MuseScore 4+ executable charts will be rendered with, or null if none. */
export function findMuseScore(): Promise<string | null> {
  return invoke<string | null>("musescore_path");
}

type PageSize = Positions["pageSize"];

const SVG_ROOT = /<svg\b[^>]*>/;

function attr(tag: string, name: string): string | undefined {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
}

/**
 * MuseScore 4 sizes its SVG root in physical units (width="215.9mm") over a
 * 1200-DPI viewBox. The viewer lays pages out in viewBox pixels (as webmscore
 * SVGs are), so restate the root size in those units.
 */
export function normalizeSvg(svg: string): { svg: string; pageSize: PageSize } {
  const root = SVG_ROOT.exec(svg)?.[0];
  const viewBox =
    root &&
    attr(root, "viewBox")
      ?.trim()
      .split(/[\s,]+/)
      .map(Number);
  if (!root || !viewBox || viewBox.length !== 4 || viewBox.some((n) => !Number.isFinite(n))) {
    throw new Error("MuseScore SVG page has no usable viewBox");
  }
  const [, , width, height] = viewBox;

  const resized = root
    .replace(/\s(width|height)="[^"]*"/g, "")
    .replace(/^<svg\b/, `<svg width="${width}px" height="${height}px"`);
  return { svg: svg.replace(root, resized), pageSize: { width, height } };
}

const mposParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  isArray: (name) => name === "element" || name === "event",
});

interface RawPositionNode {
  id?: string;
  elid?: string;
  x?: string;
  y?: string;
  sx?: string;
  sy?: string;
  page?: string;
  position?: string;
}

/**
 * Parse a MuseScore .mpos file. Coordinates are already in SVG viewBox units
 * (Rust renders with -r 100, which makes the export's scale factor exactly 1).
 */
export function parseMpos(xml: string, pageSize: PageSize): Positions {
  const doc = mposParser.parse(xml) as {
    score?: {
      elements?: { element?: RawPositionNode[] };
      events?: { event?: RawPositionNode[] };
    };
  };
  const elements = (doc.score?.elements?.element ?? []).map((el) => ({
    id: Number(el.id),
    x: Number(el.x),
    y: Number(el.y),
    sx: Number(el.sx),
    sy: Number(el.sy),
    page: Number(el.page),
  }));
  const events = (doc.score?.events?.event ?? []).map((ev) => ({
    elid: Number(ev.elid),
    position: Number(ev.position),
  }));
  return { elements, events, pageSize };
}

function toPart(view: RawView, id: number): BakedPartData | null {
  if (view.pages.length === 0) return null;
  const normalized = view.pages.map(normalizeSvg);
  const positions = parseMpos(view.mpos, normalized[0].pageSize);
  console.info(
    `[bake:musescore]   "${view.name}" (id ${id}): ${normalized.length} page(s), ${positions.elements.length} measure box(es)`,
  );
  return { id, name: view.name, pages: normalized.map((p) => p.svg), positions };
}

/** Suffix repeated names ("Guitar", "Guitar 2") so the part picker stays unambiguous. */
function disambiguate(parts: BakedPartData[]): BakedPartData[] {
  const seen = new Map<string, number>();
  return parts.map((part) => {
    const count = (seen.get(part.name) ?? 0) + 1;
    seen.set(part.name, count);
    return count > 1 ? { ...part, name: `${part.name} ${count}` } : part;
  });
}

/**
 * Bake a .mscz on disk with the installed MuseScore: full score + every part,
 * engraved exactly as MuseScore itself would. Throws if MuseScore is missing or
 * the conversion fails — callers fall back to webmscore.
 */
export async function bakeWithMuseScore(msczPath: string): Promise<BakeResult> {
  const raw = await invoke<RawBake>("musescore_bake", { msczPath });

  const full = toPart(raw.full, FULL_SCORE_PART_ID);
  if (!full) throw new Error("MuseScore rendered no pages");

  const parts = raw.parts
    .map((view, i) => toPart(view, i))
    .filter((p): p is BakedPartData => p !== null);

  return { parts: [full, ...disambiguate(parts)], musicXml: raw.musicXml };
}
