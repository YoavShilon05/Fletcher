import { useAtomValue } from "jotai";
import { useEffect } from "react";
import { hasTempoAutomation, tempoContextAtom } from "@/features/music/tempo";
import { selectedSongAtom } from "@/features/setlist/atoms";
import { live } from "@/lib/osc/live-api";

/**
 * Host: make Live's tempo match the selected song's.
 *
 * Two regimes, picked per song. A song whose range carries tempo automation is
 * driven by Live's own envelope — writing `song.tempo` would override it, which
 * is exactly what lights up Re-Enable Automation and leaves the envelope dead
 * for the rest of the show. So for those songs we write nothing and instead
 * clear any standing override on the way in. Every other song has no envelope
 * points of its own, so Fletcher sets its scene tempo as it always has.
 */
export function useSyncTempo() {
  const song = useAtomValue(selectedSongAtom);
  const tempoContext = useAtomValue(tempoContextAtom);
  const songName = song?.name;
  const tempo = song?.tempo;
  const automated = song ? hasTempoAutomation(tempoContext, song) : false;

  // Keyed on the song, not on its tempo: the envelope moves the tempo as it
  // plays, and re-enabling at every breakpoint would undo a deliberate nudge.
  useEffect(() => {
    if (automated) live.reEnableAutomation();
  }, [songName, automated]);

  useEffect(() => {
    // 0 means "not known yet" (no scene, and Live hasn't reported its tempo).
    if (!automated && songName !== undefined && tempo) live.setTempo(tempo);
  }, [songName, automated, tempo]);
}
