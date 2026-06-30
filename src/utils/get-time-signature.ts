import {Song} from "@/interfaces/song.ts";
import {globalTimeSignatureAtom, scenesAtom, timeSignatureChangesAtom} from "@/stores/store.ts";
import {getDefaultStore} from "jotai";

const store = getDefaultStore();

export const getTimeSignature = (beat?: number, song?: Song) => {

  const globalTimeSignature = store.get(globalTimeSignatureAtom)
  const scenes = store.get(scenesAtom)
  const timeSignatureChanges = store.get(timeSignatureChangesAtom);

  if (beat && song) {
    const lastTimeSignatureEvent = timeSignatureChanges.filter(
      change => change.time >= song.timelineLocation && change.time <= beat)
      .at(-1);

    if (lastTimeSignatureEvent) return lastTimeSignatureEvent.timeSignature;
  }

  if (song) {
    const sceneOfSong = scenes.find(scene => scene.name === song.name)
    if (sceneOfSong) {
      return sceneOfSong.timeSignature
    }
  }

  return globalTimeSignature
}