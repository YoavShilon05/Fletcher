import { useStore } from "jotai";
import { currentSectionAtom, selectedSongAtom } from "@/features/setlist/atoms";
import { sectionEnd } from "@/features/setlist/sections";
import { LIVE } from "@/lib/osc/addresses";
import { live } from "@/lib/osc/live-api";
import { useOscMessage } from "@/lib/osc/useOscMessage";

/** Host: when the loop is switched on in Live, fit it to the current section. */
export function useLoopSnapper() {
  const store = useStore();

  useOscMessage(LIVE.loop, (loopEnabled) => {
    if (!loopEnabled) return;

    const song = store.get(selectedSongAtom);
    const section = store.get(currentSectionAtom);
    if (!song || !section) return;

    live.setLoopStart(section.timelineLocation);
    const end = sectionEnd(song, section);
    if (end !== undefined) live.setLoopLength(end - section.timelineLocation);
  });
}
