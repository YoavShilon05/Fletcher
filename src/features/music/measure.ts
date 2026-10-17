import type { Song } from "@/types/song";
import type { TimeSignature } from "@/types/time-signature";
import { timeSignatureAt, type TimeSignatureContext } from "./time-signature";

/** Where the chart's bar 1 sits: the first section, or the song locator if it has none. */
export const chartStart = (song: Song) =>
  song.structure.at(0)?.timelineLocation ?? song.timelineLocation;

/** Measures spanned by `beats` quarter-note beats in `timeSignature`. */
const measuresIn = (beats: number, timeSignature: TimeSignature) =>
  (beats * timeSignature.denominator) / (4 * timeSignature.numerator);

/** Fractional measures between two beats, honouring time-signature changes in between. */
function measuresBetween(ctx: TimeSignatureContext, song: Song, from: number, to: number) {
  if (to <= from) return 0;
  const changes = ctx.changes.filter((change) => change.time > from && change.time < to);

  let measures = 0;
  let pointer = from;
  for (const change of changes) {
    measures += measuresIn(change.time - pointer, timeSignatureAt(ctx, song, pointer));
    pointer = change.time;
  }
  return measures + measuresIn(to - pointer, timeSignatureAt(ctx, song, pointer));
}

/**
 * Fractional measure of `beat`, counted from the chart's start rather than the
 * song locator. Beats inside the count-in (before the first section) come back
 * negative, so callers can tell "not started yet" from measure 0.
 */
export function calculateMeasure(ctx: TimeSignatureContext, song: Song, beat: number) {
  // Both legs are measured from the song locator so a time signature change
  // sitting inside the count-in is still accounted for.
  return (
    measuresBetween(ctx, song, song.timelineLocation, beat) -
    measuresBetween(ctx, song, song.timelineLocation, chartStart(song))
  );
}
