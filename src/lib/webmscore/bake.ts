import { loadWebMscore } from './loader';
import { stripExcerpts } from './strip-excerpts';
import type { WebMscoreInstance, WebMscoreStatic } from './types';
import { FULL_SCORE_PART_ID, type BakeResult, type BakedPartData } from '@/interfaces/baked-chart';

// Renders one excerpt (or the full score when id === -1) to SVG pages + a
// measure-position manifest. setExcerptId switches which excerpt every
// subsequent npages/saveSvg/measurePositions call refers to.
async function bakePart(
  score: WebMscoreInstance,
  id: number,
  name: string,
): Promise<BakedPartData | null> {
  await score.setExcerptId(id);

  const pageCount = await score.npages();
  if (pageCount <= 0) return null; // empty excerpt — nothing to show

  const pages: string[] = [];
  for (let p = 0; p < pageCount; p++) {
    // drawPageBackground: true → opaque white page, so the SVG reads correctly
    // on any viewer background.
    pages.push(await score.saveSvg(p, true));
  }

  const positions = await score.measurePositions();
  // Measure-box count vs. the song's real measures reveals multimeasure-rest
  // folding: a folded part has fewer boxes than the full score.
  console.info(`[bake]   part "${name}" (id ${id}): ${pages.length} page(s), ${positions.elements.length} measure box(es)`);
  return { id, name, pages, positions };
}

// Walk a score's generated excerpts and bake each in place by its excerpt id.
// Handles logging and duplicate-name disambiguation.
async function bakeAllExcerpts(score: WebMscoreInstance): Promise<BakedPartData[]> {
  const meta = await score.metadata();
  console.info(
    `[bake] ${meta.excerpts?.length ?? 0} excerpt(s) from ${meta.parts?.length ?? 0} part(s)`,
    meta.excerpts?.map((e) => ({ id: e.id, name: e.parts?.[0]?.instrumentName || e.title })),
  );

  const parts: BakedPartData[] = [];
  const usedNames = new Map<string, number>(); // disambiguate duplicate instrument names

  for (const ex of meta.excerpts ?? []) {
    let name = ex.parts?.[0]?.instrumentName || ex.title?.trim() || `Part ${ex.id}`;
    const seen = usedNames.get(name) ?? 0;
    usedNames.set(name, seen + 1);
    if (seen > 0) name = `${name} ${seen + 1}`;

    const part = await bakePart(score, ex.id, name);
    if (part) parts.push(part);
    else console.warn(`[bake] part "${name}" (id ${ex.id}) produced no pages — skipped`);
  }
  return parts;
}

// One selectable view per instrument. Preferred path: strip the .mscz's own
// (possibly incomplete/stale) excerpts and regenerate from the real part data,
// which keeps TAB string assignments and multi-staff grouping intact. Falls back
// to a MusicXML round-trip only if the strip path yields nothing.
async function bakeInstrumentParts(
  WebMscore: WebMscoreStatic,
  msczBytes: Uint8Array,
  musicXml: string,
): Promise<BakedPartData[]> {
  try {
    const stripped = stripExcerpts(msczBytes);
    const score = await WebMscore.load('mscz', stripped, [], true);
    try {
      // If excerpts survive the strip, the regex didn't match this MuseScore
      // format — generateExcerpts() would no-op and we'd keep the stale parts.
      // Bail to the fallback instead of silently returning them.
      const before = await score.metadata();
      if ((before.excerpts?.length ?? 0) > 0) {
        throw new Error(`strip left ${before.excerpts?.length} excerpt(s) in place`);
      }
      await score.generateExcerpts();
      const parts = await bakeAllExcerpts(score);
      if (parts.length > 0) return parts;
      throw new Error('excerpt strip produced no parts');
    } finally {
      score.destroy();
    }
  } catch (err) {
    console.warn('[bake] .mscz excerpt strip failed; falling back to MusicXML round-trip', err);
    const score = await WebMscore.load('musicxml', new TextEncoder().encode(musicXml), [], true);
    try {
      await score.generateExcerpts();
      return await bakeAllExcerpts(score);
    } finally {
      score.destroy();
    }
  }
}

/**
 * Bake a MuseScore `.mscz` into per-instrument SVG pages + position manifests
 * and the full-score MusicXML. Host-only (loads the webmscore WASM). Runs once
 * per chart; results are cached to disk by the caller.
 */
export async function bakeMscz(msczBytes: Uint8Array): Promise<BakeResult> {
  const WebMscore = await loadWebMscore();

  // WebMscore.load transfers the array's buffer to its worker, neutering
  // msczBytes here. Keep a pristine copy for the excerpt-strip pass (which reads
  // the raw zip), taken before the load consumes the original.
  const msczForParts = msczBytes.slice();

  const score = await WebMscore.load('mscz', msczBytes, [], true);

  try {
    const meta = await score.metadata();
    console.info(
      `[bake] "${meta.title}": ${meta.parts?.length ?? 0} part(s) in the score`,
      meta.parts?.map((p) => ({ name: p.instrumentName, visible: p.isVisible })),
    );

    // Full score straight from the .mscz — preserves its engraving. Also the
    // excerpt we export MusicXML from (feeds ChordView + the round-trip fallback).
    await score.setExcerptId(FULL_SCORE_PART_ID);
    const musicXml = await score.saveXml();

    const parts: BakedPartData[] = [];
    const full = await bakePart(score, FULL_SCORE_PART_ID, 'Full Score');
    if (full) parts.push(full);

    // If the file defines ANY parts, honour them verbatim — their layout and
    // multimeasure-rest setting are the author's choice (option 2: your MuseScore
    // parts win). Only auto-generate when the file has no parts at all.
    const excerptCount = meta.excerpts?.length ?? 0;
    if (excerptCount > 0) {
      console.info(`[bake] using the file's own ${excerptCount} part(s) as-is`);
      parts.push(...(await bakeAllExcerpts(score)));
    } else {
      console.info(`[bake] file defines no parts — regenerating from instruments`);
      parts.push(...(await bakeInstrumentParts(WebMscore, msczForParts, musicXml)));
    }

    return { parts, musicXml };
  } finally {
    score.destroy();
  }
}
