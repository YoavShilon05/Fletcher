import { useStore } from "jotai";
import { isPlayingAtom, scenesAtom } from "@/features/live/atoms";
import { chartStart } from "@/features/music/measure";
import { LIVE } from "@/lib/osc/addresses";
import { useOscMessage } from "@/lib/osc/useOscMessage";
import { cueToAtom } from "./actions";
import { currentSectionAtom, selectedSongAtom, setlistAtom } from "./atoms";
import { sectionAt } from "./sections";

/**
 * Host: selecting a scene in Live selects the song of the same name and parks
 * Live's cursor on its START marker — not on the song locator, so the cursor
 * lands on the chart's bar 1 rather than ahead of the count-in. Independent of
 * snap selection, which only governs how the cursor moves from there.
 */
export function useSceneSelection() {
  const store = useStore();

  useOscMessage(LIVE.selectedScene, (sceneIndex) => {
    const sceneName = store.get(scenesAtom)[sceneIndex]?.name;
    const song = store.get(setlistAtom).find((s) => s.name === sceneName);
    if (!song) return;

    store.set(selectedSongAtom, song);
    // Mid-song a scene click is a selection, not a cue — don't yank playback.
    if (store.get(isPlayingAtom)) return;

    const start = chartStart(song);
    store.set(currentSectionAtom, sectionAt(song, start));
    store.set(cueToAtom, start);
  });
}
