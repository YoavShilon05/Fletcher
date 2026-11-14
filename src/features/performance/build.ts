import { ARRANGEMENT_END, CUE_CLIP_WARPING } from "@/constants";
import { live } from "@/lib/osc/live-api";
import type { Song } from "@/types/song";
import { compileCues, cueRange } from "./compile-cues";

/**
 * Compiling edits the arrangement, so nothing may be rolling while it happens.
 * Live is assumed to be idle at build time — this just makes sure of it.
 */
async function quiesce() {
  await live.stopPlaying();
  await live.stopAllClips();
  await live.backToArranger();
}

/**
 * Build one song's spoken cues onto the Fletcher_Count track, replacing
 * whatever was there before. `nextSong` bounds how far the rebuild may reach.
 *
 * Awaited throughout: OSC is fire-and-forget UDP, so commands issued without
 * awaiting can land out of order (see clips.ts).
 */
export async function buildSong(trackIndex: number, song: Song, nextSong?: Song) {
  const cues = compileCues(song);
  await live.buildArrangementClips(trackIndex, cueRange(song, nextSong), CUE_CLIP_WARPING, cues);
  return cues.length;
}

/** Build one song, stopping Live first. Returns how many cues were sent. */
export async function buildOneSong(trackIndex: number, song: Song, nextSong?: Song) {
  await quiesce();
  return buildSong(trackIndex, song, nextSong);
}

/**
 * Build the whole set. The track is cleared wholesale first, so cues left over
 * from songs that have since been renamed or removed don't survive.
 */
export async function buildWholeSet(trackIndex: number, setlist: Song[]) {
  await quiesce();
  await live.clearArrangementClips(trackIndex, 0, ARRANGEMENT_END);

  let built = 0;
  for (const [index, song] of setlist.entries()) {
    built += await buildSong(trackIndex, song, setlist[index + 1]);
  }
  return built;
}
