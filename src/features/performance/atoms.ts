import { atom } from "jotai";
import { FLETCHER_CONTROL_TRACK_NAME, FLETCHER_COUNT_TRACK_NAME } from "@/constants";
import { trackNamesAtom } from "@/features/live/atoms";
import { setlistAtom } from "@/features/setlist/atoms";
import { cueRange } from "./compile-cues";

/** Moving Live's cursor snaps it to the nearest section (or song) start. */
export const snapSelectionAtom = atom(false);

/** Index of the Fletcher_Count track, or -1 if the set doesn't have one. */
export const countTrackIndexAtom = atom((get) =>
  get(trackNamesAtom).indexOf(FLETCHER_COUNT_TRACK_NAME),
);
/** Index of the Fletcher_Control track, or -1 if the set doesn't have one. */
export const controlTrackIndexAtom = atom((get) =>
  get(trackNamesAtom).indexOf(FLETCHER_CONTROL_TRACK_NAME),
);

/** Where the Fletcher_Count track's timeline clips currently sit, in beats. */
export const builtCueTimesAtom = atom<number[]>([]);

/**
 * Songs being compiled right now, by name. Builds run one at a time, so this
 * is both the queue and the progress indicator; empty means nothing is running.
 */
export const buildingSongsAtom = atom<readonly string[]>([]);

/** Names of the songs that have cues on the timeline. */
export const builtSongNamesAtom = atom((get) => {
  const times = get(builtCueTimesAtom);
  const setlist = get(setlistAtom);
  return new Set(
    setlist
      .filter((song, index) => {
        const { from, to } = cueRange(song, setlist[index + 1]);
        return times.some((time) => time >= from && time < to);
      })
      .map((song) => song.name),
  );
});
