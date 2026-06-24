import {useCallback, useEffect, useState} from "react";
import {sendOsc, useOscListener} from "@/hooks/useOsc.ts";
import {parseOscPayload} from "@/utils/parse-osc-payload.ts";
import {Scene} from "@/interfaces/scene.ts";


export const useSceneSelection = (setSelectedSong: (songName: string) => void) => {

  const [scenes, setScenes] = useState<Scene[]>([]); //todo: prob move into an atom

  useEffect(() => {
    sendOsc("/live/view/start_listen/selected_scene", []);
    sendOsc("/live/song/start_listen/scenes", [])
  }, []);

  const handleMessage = useCallback((msg: { address: string; args: string[] }) => {
    const payload = parseOscPayload<(number | string)[]>(msg.args)

    switch (msg.address) {
      case "/live/view/get/selected_scene":
        console.log("SELECT SCENEEEEEE")
        const payloadSceneIndex = payload[0] as number;
        const scene = scenes[payloadSceneIndex];

        setSelectedSong(scene.name)

        break;

      case "/live/song/get/scenes":
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
        break;
    }

    // if (msg.address !== "/live/song/get/selected_scene") return;
    // const payload = parseOscPayload(msg.args)
    // console.log("PAYLOAD", payload)

  }, []);

  useOscListener(handleMessage);

}