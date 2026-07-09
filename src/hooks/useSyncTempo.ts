import {useAtomValue} from "jotai";
import {selectedSongAtom} from "@/stores/store.ts";
import {useEffect} from "react";
import {sendOsc} from "@/hooks/useOsc.ts";

export const useSyncTempo = () => {
  const selectedSong = useAtomValue(selectedSongAtom)

  useEffect(() => {
    sendOsc("/live/song/set/tempo", [selectedSong?.tempo])
  }, [selectedSong]);

}