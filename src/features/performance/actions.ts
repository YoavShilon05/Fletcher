import { atom } from "jotai";
import { setlistAtom } from "@/features/setlist/atoms";
import { live } from "@/lib/osc/live-api";
import type { Song } from "@/types/song";
import { buildingSongsAtom, countTrackIndexAtom } from "./atoms";
import { buildOneSong, buildWholeSet } from "./build";

/**
 * Run a build, marking the songs it covers as in progress so the UI can show
 * it, and asking Live what ended up on the timeline once it's done — that
 * reply, not the send, is what proves the cues are really there.
 */
const runBuild = atom(
  null,
  async (
    get,
    set,
    songs: Song[],
    build: (trackIndex: number, setlist: Song[]) => Promise<number>,
  ) => {
    const trackIndex = get(countTrackIndexAtom);
    if (trackIndex === -1 || get(buildingSongsAtom).length > 0) return;

    set(
      buildingSongsAtom,
      songs.map((song) => song.name),
    );
    try {
      return await build(trackIndex, get(setlistAtom));
    } finally {
      set(buildingSongsAtom, []);
      await live.queryArrangementClipTimes(trackIndex);
    }
  },
);

/** Compile one song's spoken cues onto the Fletcher_Count track. */
export const buildSongAtom = atom(null, (_get, set, song: Song) =>
  set(runBuild, [song], (trackIndex, setlist) => {
    const index = setlist.findIndex((candidate) => candidate.name === song.name);
    return buildOneSong(trackIndex, song, setlist[index + 1]);
  }),
);

/** Compile the whole set, clearing the Fletcher_Count timeline first. */
export const buildSetlistAtom = atom(null, (get, set) =>
  set(runBuild, get(setlistAtom), buildWholeSet),
);
