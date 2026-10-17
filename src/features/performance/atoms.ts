import { atom } from "jotai";
import { FLETCHER_CONTROL_TRACK_NAME, FLETCHER_COUNT_TRACK_NAME } from "@/constants";
import { trackNamesAtom } from "@/features/live/atoms";

/** Scrubbing the playhead (or picking a scene) snaps to section/song starts. */
export const snapSelectionAtom = atom(false);
/** Fire spoken count-in / section cues ahead of each section while playing. */
export const shotCallingAtom = atom(true);

/** Index of the Fletcher_Count track, or -1 if the set doesn't have one. */
export const countTrackIndexAtom = atom((get) =>
  get(trackNamesAtom).indexOf(FLETCHER_COUNT_TRACK_NAME),
);
/** Index of the Fletcher_Control track, or -1 if the set doesn't have one. */
export const controlTrackIndexAtom = atom((get) =>
  get(trackNamesAtom).indexOf(FLETCHER_CONTROL_TRACK_NAME),
);
