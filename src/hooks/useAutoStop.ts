import {usePropertyListener} from "@/hooks/usePropertyListener.ts";
import {useAtomValue} from "jotai";
import {selectedSongAtom} from "@/stores/store.ts";
import {sendOsc} from "@/hooks/useOsc.ts";
import {useNextSong} from "@/hooks/useNextSong.ts";

export const useAutoStop = () => {

  const selectedSong = useAtomValue(selectedSongAtom)
  const nextSong = useNextSong()

  const listenForStopSong = (payload: number[]) => {
    if (!selectedSong) return;
    const timelineLocation = payload[0]

    if (selectedSong.end && timelineLocation >= selectedSong.end) {
      sendOsc("/live/song/stop_playing", [])
      if (nextSong) {
        sendOsc(`/live/song/set/start_time`, [nextSong.timelineLocation])
      }
    }
  }

  usePropertyListener("/live/song/start_listen/beat", "/live/song/get/beat", listenForStopSong)
}