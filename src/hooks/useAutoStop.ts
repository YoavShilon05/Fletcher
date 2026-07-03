import {useAtomValue} from "jotai";
import {currentBeatAtom, currentlyPlayingAtom, selectedSongAtom} from "@/stores/store.ts";
import {sendOsc} from "@/hooks/useOsc.ts";
import {useNextSong} from "@/hooks/useNextSong.ts";
import {useEffect} from "react";
import {AUTO_STOP_MARGIN} from "@/constants.ts";

export const useAutoStop = () => {

  const selectedSong = useAtomValue(selectedSongAtom)
  const nextSong = useNextSong()
  const currentlyPlaying = useAtomValue(currentlyPlayingAtom)

  const currentBeat = useAtomValue(currentBeatAtom)

  const listenForStopSong = () => {
    if (!selectedSong) return;
    if (!selectedSong.end) return;

    const distance = currentBeat - selectedSong.end;
    if (distance < 0 || distance > AUTO_STOP_MARGIN) return;

    sendOsc("/live/song/stop_playing", [])
    if (nextSong) {
      sendOsc(`/live/song/set/start_time`, [nextSong.timelineLocation])
    }

  }

  useEffect(() => {
    if (!currentlyPlaying) return;
    listenForStopSong()
  }, [currentBeat]);
}