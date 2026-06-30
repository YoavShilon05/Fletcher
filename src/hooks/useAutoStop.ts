import {useAtomValue} from "jotai";
import {currentBeatAtom, selectedSongAtom} from "@/stores/store.ts";
import {sendOsc} from "@/hooks/useOsc.ts";
import {useNextSong} from "@/hooks/useNextSong.ts";
import {useEffect} from "react";

export const useAutoStop = () => {

  const selectedSong = useAtomValue(selectedSongAtom)
  const nextSong = useNextSong()

  const currentBeat = useAtomValue(currentBeatAtom)

  const listenForStopSong = () => {
    if (!selectedSong) return;

    if (selectedSong.end && currentBeat >= selectedSong.end) {
      sendOsc("/live/song/stop_playing", [])
      if (nextSong) {
        sendOsc(`/live/song/set/start_time`, [nextSong.timelineLocation])
      }
    }
  }

  useEffect(() => {
    listenForStopSong()
  }, [currentBeat]);
}