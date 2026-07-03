import {Scene} from "@/interfaces/scene.ts";
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {scenesAtom, selectedSongAtom, setlistAtom} from "@/stores/store.ts";
import {usePropertyListener} from "@/hooks/usePropertyListener.ts";
import {sendOsc} from "@/hooks/useOsc.ts";


export const useSceneSelection = () => {

  const setlist = useAtomValue(setlistAtom)
  const setSelectedSong = useSetAtom(selectedSongAtom)
  const [scenes, setScenes] = useAtom(scenesAtom);

  const updateScenes = (payload: (number | string)[]) => {
    const payloadScenes: Scene[] = []
    for (let i = 0; i < payload.length; i += 4) {
      const sceneName = payload[i] as string
      const sceneBpm = payload[i + 1] as number
      const sceneTimeSignatureNumerator = payload[i + 2] as number
      const sceneTimeSignatureDenominator = payload[i + 3] as number

      payloadScenes.push({
        name: sceneName,
        tempo: sceneBpm,
        timeSignature: {
          numerator: sceneTimeSignatureNumerator,
          denominator: sceneTimeSignatureDenominator
        }
      })

    }

    setScenes(payloadScenes)
  }

  const selectSong = (payload: (number | string)[]) => {
    const payloadSceneIndex = payload[0] as number;
    const songName = scenes[payloadSceneIndex].name;

    const song = setlist?.find(song => song.name === songName)
    if (song) {
      setSelectedSong(song)
      sendOsc(`/live/song/set/start_time`, [song.timelineLocation])
    }
  }

  usePropertyListener("/live/view/start_listen/selected_scene", "/live/view/get/selected_scene", selectSong)
  usePropertyListener("/live/song/start_listen/scenes", "/live/song/get/scenes", updateScenes)

}