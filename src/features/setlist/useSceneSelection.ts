import { useStore } from "jotai";
import { scenesAtom } from "@/features/live/atoms";
import { snapSelectionAtom } from "@/features/performance/atoms";
import { LIVE } from "@/lib/osc/addresses";
import { live } from "@/lib/osc/live-api";
import { useOscMessage } from "@/lib/osc/useOscMessage";
import { selectedSongAtom, setlistAtom } from "./atoms";

/** Host, snap-selection mode: selecting a scene in Live selects the song of the same name. */
export function useSceneSelection() {
  const store = useStore();

  useOscMessage(LIVE.selectedScene, (sceneIndex) => {
    if (!store.get(snapSelectionAtom)) return;

    const sceneName = store.get(scenesAtom)[sceneIndex]?.name;
    const song = store.get(setlistAtom).find((s) => s.name === sceneName);
    if (!song) return;

    store.set(selectedSongAtom, song);
    live.setStartTime(song.timelineLocation);
  });
}
