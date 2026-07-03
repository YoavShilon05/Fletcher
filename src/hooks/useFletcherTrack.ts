import {usePropertyListener} from "@/hooks/usePropertyListener.ts";
import {FLETCHER_TRACK_NAME} from "@/constants.ts";
import {sendOsc} from "@/hooks/useOsc.ts";
import {useSetAtom} from "jotai";
import {fletcherTrackIndexAtom} from "@/stores/store.ts";

export const useFletcherTrack = () => {

  const setTrackIndex = useSetAtom(fletcherTrackIndexAtom)

  const onTrackRenames = (payload: string[]) => {
    const trackNames = payload;
    const index = trackNames.findIndex(name => name === FLETCHER_TRACK_NAME);
    // if (index !== -1) {
    setTrackIndex(index)
    return;
    // };
    //todo: move the creation of the fletcher track to the preparation func.
    sendOsc("/live/song/create_audio_track", [0])
    sendOsc("/live/track/set/name", [0, FLETCHER_TRACK_NAME])
  }

  usePropertyListener("/live/song/start_listen/track_names", "/live/song/get/track_names", onTrackRenames)
}