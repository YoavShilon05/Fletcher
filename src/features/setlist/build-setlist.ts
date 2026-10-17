import type { Locator } from "@/lib/osc/addresses";
import type { Scene } from "@/types/scene";
import { ExtraCueNames, SectionNames, START_SONG, STOP_SONG, type Song } from "@/types/song";

const SECTION_NAMES = new Set<string>(Object.values(SectionNames));
const EXTRA_CUE_NAMES = new Set<string>(Object.values(ExtraCueNames));

/**
 * Turn the Live set's locators into a setlist. Locators are read in timeline
 * order: a name that isn't a section, cue, START or STOP starts a new song, and the
 * ones after it belong to that song. Locators before the first song are ignored.
 *
 * A song's tempo comes from the scene with the same name, else the set's tempo.
 */
export function buildSetlist(locators: Locator[], scenes: Scene[], globalTempo: number): Song[] {
  const songs: Song[] = [];
  const sorted = [...locators].sort((a, b) => a.location - b.location);

  for (const { name, location } of sorted) {
    const song = songs.at(-1);

    if (name === START_SONG) {
      if (song) song.start = location;
    } else if (name === STOP_SONG) {
      if (song) song.end = location;
    } else if (SECTION_NAMES.has(name)) {
      song?.structure.push({ name: name as SectionNames, timelineLocation: location });
    } else if (EXTRA_CUE_NAMES.has(name)) {
      song?.extraCalls.push({ name: name as ExtraCueNames, timelineLocation: location });
    } else {
      songs.push({
        name,
        timelineLocation: location,
        tempo: scenes.find((scene) => scene.name === name)?.tempo ?? globalTempo,
        structure: [],
        extraCalls: [],
      });
    }
  }

  return songs;
}
