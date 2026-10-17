import { useAtomValue } from "jotai";
import { useEffect } from "react";
import { selectedSongAtom } from "@/features/setlist/atoms";
import { live } from "@/lib/osc/live-api";

/** Host: set Live's tempo to the selected song's. */
export function useSyncTempo() {
  const song = useAtomValue(selectedSongAtom);
  const songName = song?.name;
  const tempo = song?.tempo;

  useEffect(() => {
    // 0 means "not known yet" (no scene, and Live hasn't reported its tempo).
    if (songName !== undefined && tempo) live.setTempo(tempo);
  }, [songName, tempo]);
}
