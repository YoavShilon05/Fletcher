import {Song} from "@/interfaces/song.ts";
import {useAtomValue} from "jotai";
import {globalTimeSignatureAtom, scenesAtom} from "@/stores/store.ts";


export const useGetTimeSignature = (beat?: number, song?: Song) => {

  const globalTimeSignature = useAtomValue(globalTimeSignatureAtom)
  const scenes = useAtomValue(scenesAtom)

  //todo: return based on beat and song chart.

  if (song) {
    const sceneOfSong = scenes.find(scene => scene.name === song.name)
    if (sceneOfSong) {
      return sceneOfSong.timeSignature
    }
  }

  return globalTimeSignature
}