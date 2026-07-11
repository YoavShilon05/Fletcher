import {useAtom, useAtomValue} from "jotai";
import {currentBeatAtom, currentlyPlayingAtom, selectedSongAtom} from "@/stores/store.ts";
import {sendOsc} from "@/hooks/useOsc.ts";
import {useNextSong} from "@/hooks/useNextSong.ts";
import {useEffect} from "react";
import {AUTO_STOP_MARGIN} from "@/constants.ts";

export const useAutoStop = () => {

  const [selectedSong, setSelectedSong] = useAtom(selectedSongAtom)
  const nextSong = useNextSong()
  const currentlyPlaying = useAtomValue(currentlyPlayingAtom)

  const currentBeat = useAtomValue(currentBeatAtom)

  const listenForStopSong = () => {
    if (!selectedSong) return;
    if (!selectedSong.end) return;

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

  useEffect(() => {
    if (!currentlyPlaying) return;
    listenForStopSong()
  }, [currentBeat]);
}