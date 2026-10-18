import { FULL_SCORE_PART_ID, type BakeResult, type Positions } from "@/lib/webmscore/types";

// Fletcher counts measures linearly along the Live timeline, i.e. in *played*
// order: a repeated section is counted twice. A score's measure boxes are in
// *written* order, and a part may fold empty bars into one multimeasure rest,
// so "measure k" is rarely "box k".
//
// MuseScore's position export already solves this: its `events` list every box
// in playback order (repeats, voltas and jumps expanded) with a start time. The
// full score — one box per written measure — gives the start time of each
// played measure; any part's box for that measure is the last one to start at
// or before it. Both scores share one tempo map, so the times line up exactly.

// Times are integer ms rounded from the same tick math; allow for rounding.
const TOLERANCE_MS = 1;

/** Played measure → index into `target.elements` (-1 if none), timed by `reference`. */
export function buildMeasureMap(reference: Positions, target: Positions): number[] | undefined {
  if (reference.events.length === 0 || target.events.length === 0) return undefined;

  const indexOfId = new Map(target.elements.map((el, i) => [el.id, i]));
  const byTime = (a: { position: number }, b: { position: number }) => a.position - b.position;
  const played = [...reference.events].sort(byTime);
  const boxes = [...target.events].sort(byTime);

  let j = 0;
  return played.map(({ position }) => {
    while (j + 1 < boxes.length && boxes[j + 1].position <= position + TOLERANCE_MS) j++;
    if (boxes[j].position > position + TOLERANCE_MS) return -1; // before the part's first box
    return indexOfId.get(boxes[j].elid) ?? -1;
  });
}

/**
 * Attach a played-measure map to every part of a bake, timed against the full
 * score. Assumes the full score has no multimeasure rests (MuseScore's default
 * for scores), so its events are one per played measure.
 */
export function withMeasureMaps(result: BakeResult): BakeResult {
  const reference = result.parts.find((p) => p.id === FULL_SCORE_PART_ID)?.positions;
  if (!reference) return result;
  return {
    ...result,
    parts: result.parts.map((part) => {
      const measures = buildMeasureMap(reference, part.positions);
      return measures ? { ...part, positions: { ...part.positions, measures } } : part;
    }),
  };
}

/** The `elements` index to highlight for a played measure. */
export function elementIndexFor(positions: Positions, playedMeasure: number): number {
  return positions.measures ? (positions.measures[playedMeasure] ?? -1) : playedMeasure;
}
