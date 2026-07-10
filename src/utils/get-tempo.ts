import {getDefaultStore} from "jotai";
import {globalTempoAtom, scenesAtom} from "@/stores/store.ts";

const store = getDefaultStore();

export const getTempo = (songName?: string) => {
  const scenes = store.get(scenesAtom)
  const songScene = scenes.find(scene => scene.name === songName)

  if (songScene) {
    return songScene.tempo
  }

  return store.get(globalTempoAtom)
}