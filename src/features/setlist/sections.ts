import { chartStart } from "@/features/music/measure";
import type { Song, SongSection } from "@/types/song";

/** The song whose locator is the last one at or before `beat`. */
export const songAt = (setlist: Song[], beat: number): Song | undefined =>
  setlist.findLast((song) => song.timelineLocation <= beat);

/**
 * The section of `song` playing at `beat` — undefined before the song (or
 * during its count-in) and after its STOP locator.
 */
export function sectionAt(song: Song | undefined, beat: number): SongSection | undefined {
  if (!song || beat < song.timelineLocation) return undefined;
  if (song.end !== undefined && beat > song.end) return undefined;
  return song.structure.findLast((section) => beat >= section.timelineLocation);
}

/** Index of `section` in its song's structure (sections are identified by location). */
export const sectionIndex = (song: Song, section: SongSection | undefined) =>
  section ? song.structure.findIndex((s) => s.timelineLocation === section.timelineLocation) : -1;

/** Where a section's loop should end: the next section, else the song's STOP locator. */
export function sectionEnd(song: Song, section: SongSection): number | undefined {
  const next = song.structure.find((s) => s.timelineLocation > section.timelineLocation);
  return next?.timelineLocation ?? song.end;
}

/** The song `offset` places away from `song` in the setlist. */
export function neighbourSong(setlist: Song[], song: Song | undefined, offset: number) {
  if (!song) return undefined;
  const index = setlist.findIndex((s) => s.name === song.name);
  return index === -1 ? undefined : setlist[index + offset];
}

/** The section `offset` places away from `section` in its song. */
export function neighbourSection(song: Song, section: SongSection | undefined, offset: number) {
  if (!section) return undefined;
  return song.structure[sectionIndex(song, section) + offset];
}

/**
 * Every beat Live's cursor may rest on in snap mode, in timeline order: each
 * song's START marker and each of its section starts, across the whole set.
 */
export function snapPoints(setlist: Song[]): number[] {
  const points = setlist.flatMap((song) => [
    chartStart(song),
    ...song.structure.map((section) => section.timelineLocation),
  ]);
  return [...new Set(points)].sort((a, b) => a - b);
}

/** Index of the last snap point at or before `beat`, clamped to the first one. */
const pointAtOrBefore = (points: number[], beat: number) =>
  Math.max(
    points.findLastIndex((point) => point <= beat),
    0,
  );

/**
 * Where a move of the cursor from `fromBeat` to `toBeat` should land: the start
 * of the section it moved into, or — when it never left the section it came
 * from — the neighbouring section in the direction it moved.
 */
export function snapTarget(points: number[], fromBeat: number, toBeat: number) {
  if (points.length === 0) return undefined;

  const landed = pointAtOrBefore(points, toBeat);
  const left = pointAtOrBefore(points, fromBeat);
  const index = landed === left ? landed + (toBeat > fromBeat ? 1 : -1) : landed;

  return points[Math.min(Math.max(index, 0), points.length - 1)];
}
