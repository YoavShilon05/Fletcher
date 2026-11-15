import type { Song } from "@/types/song";
import type { TimeSignature } from "@/types/time-signature";
import { calculateMeasure } from "./measure";
import type { TimeSignatureContext } from "./time-signature";

/**
 * Pulses — notes of the signature's denominator — per quarter-note beat: 1 in
 * x/4, 2 in x/8, 4 in x/16.
 *
 * A denominator longer than a quarter note has nothing to subdivide, so its
 * pulse *is* the beat and 12/2 counts like 12/4. Live only offers 1, 2, 4, 8
 * and 16 (see `als.ts`), but the rounding keeps anything else sane.
 */
export const pulsesPerBeat = ({ denominator }: TimeSignature) =>
  Math.max(1, Math.round(denominator / 4));

/**
 * The bar's pulses split into quarter-note beats — one group per beat, holding
 * the pulse indices it covers. 12/8 gives six groups of two, 12/16 three of
 * four, and x/4 one pulse each.
 *
 * A numerator that doesn't divide into whole beats (7/8) ends on a short group,
 * which is how Live counts it too: the bar is simply three and a half beats.
 */
export function pulseGroups({ numerator, denominator }: TimeSignature): number[][] {
  const perBeat = pulsesPerBeat({ numerator, denominator });
  const groups: number[][] = [];
  for (let first = 0; first < numerator; first += perBeat) {
    const length = Math.min(perBeat, numerator - first);
    groups.push(Array.from({ length }, (_, index) => first + index));
  }
  return groups;
}

/**
 * Which pulse of the bar `beat` lands on, wrapped into [0, numerator) — the
 * index to match against `pulseGroups`.
 *
 * With a song, bars are counted from the chart's start, so the measure maths
 * (and anything negative through the count-in) comes from `calculateMeasure`.
 * Without one there's no bar line to count from, so pulses run from the start
 * of the timeline.
 */
export function pulseInBar(
  ctx: TimeSignatureContext,
  timeSignature: TimeSignature,
  beat: number,
  song?: Song,
): number {
  const { numerator } = timeSignature;
  const pulse = song
    ? calculateMeasure(ctx, song, beat) * numerator
    : beat * pulsesPerBeat(timeSignature);
  return ((Math.round(pulse) % numerator) + numerator) % numerator;
}
