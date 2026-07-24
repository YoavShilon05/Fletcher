import {useEffect} from "react";
import {useAtom, getDefaultStore} from "jotai";
import {usePropertyListener} from "@/hooks/usePropertyListener.ts";
import {sendOsc} from "@/hooks/useOsc.ts";
import {FLETCHER_CONTROL_TRACK_NAME, FLETCHER_COUNT_TRACK_NAME} from "@/constants.ts";
import {fletcherControlTrackIndexAtom, fletcherCountTrackIndexAtom} from "@/stores/store.ts";
import {controlClips, countClips} from "@/utils/clips-array.ts";
import {prepareClips, prepareControlClips} from "@/utils/prepare-clips.ts";

const store = getDefaultStore();

// Tracks the Fletcher_Count / Fletcher_Control track indices (auto-detecting
// tracks that already exist in the project or were created manually) and
// keeps their clip slots in sync whenever they're found.
export const useFletcherTrack = () => {

  const [countTrackIndex, setCountTrackIndex] = useAtom(fletcherCountTrackIndexAtom)
  const [controlTrackIndex, setControlTrackIndex] = useAtom(fletcherControlTrackIndexAtom)

  const onTrackNamesChanged = (trackNames: string[]) => {
    setCountTrackIndex(trackNames.indexOf(FLETCHER_COUNT_TRACK_NAME))
    setControlTrackIndex(trackNames.indexOf(FLETCHER_CONTROL_TRACK_NAME))
  }

  usePropertyListener("/live/song/start_listen/track_names", "/live/song/get/track_names", onTrackNamesChanged)

  useEffect(() => {
    if (countTrackIndex !== -1) prepareClips(countTrackIndex, countClips)
  }, [countTrackIndex]);

  useEffect(() => {
    if (controlTrackIndex !== -1) prepareControlClips(controlTrackIndex, controlClips)
  }, [controlTrackIndex]);
}

export const createFletcherTracks = () => {
  if (store.get(fletcherCountTrackIndexAtom) === -1) {
    sendOsc("/live/song/create_audio_track", [0])
    sendOsc("/live/track/set/name", [0, FLETCHER_COUNT_TRACK_NAME])
  }
  if (store.get(fletcherControlTrackIndexAtom) === -1) {
    sendOsc("/live/song/create_midi_track", [0])
    sendOsc("/live/track/set/name", [0, FLETCHER_CONTROL_TRACK_NAME])
  }
}

// Deletes whichever of the two Fletcher tracks currently exist.
export const deleteFletcherTracks = () => {
  [store.get(fletcherCountTrackIndexAtom), store.get(fletcherControlTrackIndexAtom)]
    .filter(index => index !== -1)
    .sort((a, b) => b - a) // delete highest index first so indices don't shift out from under us
    .forEach(index => sendOsc("/live/song/delete_track", [index]))
}
