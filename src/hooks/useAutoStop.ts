import {useAtom, useAtomValue} from "jotai";
import {currentlyPlayingAtom, selectedSongAtom} from "@/stores/store.ts";
import {sendOsc} from "@/hooks/useOsc.ts";
import {useNextSong} from "@/hooks/useNextSong.ts";
import {AUTO_STOP_MARGIN} from "@/constants.ts";
import {usePropertyListener} from "@/hooks/usePropertyListener.ts";

export const useAutoStop = () => {

  const [selectedSong, setSelectedSong] = useAtom(selectedSongAtom)
  const nextSong = useNextSong()
  const currentlyPlaying = useAtomValue(currentlyPlayingAtom)

  const listenForStopSong = (payload: number[]) => {
    console.log(payload)

    if (!currentlyPlaying) return;
    if (!selectedSong) return;
    if (!selectedSong.end) return;
    const currentBeat = payload[0];

    const distance = currentBeat - selectedSong.end;
    if (distance < 0 || distance > AUTO_STOP_MARGIN) return;

    if (nextSong) {
      // sendOsc(`/live/song/jump_by`, [8]);
      sendOsc(`/live/song/set/start_time`, [nextSong.timelineLocation])
      // sendOsc(`/live/song/jump_by`, [nextSong.timelineLocation - currentBeat])
      // sendOsc(`/live/song/jump_to_next_cue`, [])
      setSelectedSong(nextSong)
    }

    sendOsc("/live/song/stop_playing", [])

  }

  usePropertyListener(null, "/live/song/get/beat", listenForStopSong)
}