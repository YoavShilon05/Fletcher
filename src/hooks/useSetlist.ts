import {useCallback, useEffect} from "react";
import {sendOsc, useOscListener} from "@/hooks/useOsc.ts";
import {parseOscPayload} from "@/utils/parse-osc-payload.ts";
import {Song} from "@/interfaces/song.ts";
import {SectionNames} from "@/interfaces/song-section.ts";
import {useAtom} from "jotai";
import {setlistAtom} from "@/stores/store.ts";

export const useSetlist = () => {

  const [setlist, setSetlist] = useAtom(setlistAtom);

  useEffect(() => {
    // sendOsc("/live/song/start_listen/cue_points", [])
    sendOsc("/live/test", [])
    sendOsc("/live/view/start_listen/selected_scene", [])
    sendOsc("/live/song/get/cue_points", [])
    sendOsc("/live/song/start_listen/cue_points", [])
  }, []);

  const handleMessage = useCallback((msg: { address: string; args: string[] }) => {
    if (msg.address !== "/live/song/get/cue_points") return;
    const payload = parseOscPayload<(number | string)[]>(msg.args)
    const locators: {name: string, location: number}[] = []
    for (let i = 0; i < payload.length; i += 2) {
      locators.push({
        name: payload[i] as string,
        location: payload[i + 1] as number,
      });
    }

    const songs: Song[] = []

    for (const locator of locators.sort((a, b) => a.location - b.location)) {

      if (Object.values(SectionNames).includes(locator.name as SectionNames)) {
        // locator marks a section
        const song = songs.at(-1)
        if (!song) return;

        song.structure.push({
          name: locator.name as SectionNames,
          timelineLocation: locator.location
        })
      }

      else {
        songs.push({
          name: locator.name,
          timelineLocation: locator.location,
          bpm: 100,
          structure: [],
          key: "Am"
        })
      }

    }

    // const songs: Song[] = locators.map(locator => ({
    //   name: locator.name,
    //   timelineLocation: locator.location,
    //   bpm: 100,
    //   structure: []
    // }));

    setSetlist(songs);
  }, []);

  useOscListener(handleMessage);

  return setlist
}