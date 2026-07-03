import {Song} from "@/interfaces/song.ts";
import {ExtraCueNames, SectionNames, STOP_SONG} from "@/interfaces/song-section.ts";
import {useAtom, useAtomValue} from "jotai";
import {scenesAtom, setlistAtom} from "@/stores/store.ts";
import {usePropertyListener} from "@/hooks/usePropertyListener.ts";
import {useEffect, useState} from "react";
import {getTempo} from "@/utils/get-tempo.ts";

export const useSetlist = () => {

  const [setlist, setSetlist] = useAtom(setlistAtom);
  const [locators, setLocators] = useState<{name: string, location: number}[]>([]);
  const scenes = useAtomValue(scenesAtom)

  const updateSetlist = () => {
    const songs: Song[] = []

    for (const locator of locators.sort((a, b) => a.location - b.location)) {
      const lastSong = songs.at(-1)

      if (locator.name === STOP_SONG) {
        if (!lastSong) return;

        lastSong.end = locator.location;
      }

      else if (Object.values(SectionNames).includes(locator.name as SectionNames)) {
        // locator marks a section
        if (!lastSong) return;

        lastSong.structure.push({
          name: locator.name as SectionNames,
          timelineLocation: locator.location
        })
      }
      else if (Object.values(ExtraCueNames).includes(locator.name as ExtraCueNames)) {
        // locator marks a cue call
        if (!lastSong) return;

        lastSong.extraCalls.push({
          name: locator.name as ExtraCueNames,
          timelineLocation: locator.location
        })
      }

      else {
        songs.push({
          name: locator.name,
          timelineLocation: locator.location,
          tempo: getTempo(locator.name),
          structure: [{
            name: SectionNames.INTRO,
            timelineLocation: locator.location
          }],
          extraCalls: [],
          key: "Am"
        })
      }

    }

    setSetlist(songs);
  }

  useEffect(() => {
    updateSetlist();
  }, [scenes, locators]);

  const updateLocators = (payload: (number | string)[]) => {
    const payloadLocators: (typeof locators) = []
    for (let i = 0; i < payload.length; i += 2) {
      payloadLocators.push({
        name: payload[i] as string,
        location: payload[i + 1] as number,
      });
    }
    setLocators(payloadLocators)
  };

  usePropertyListener("/live/song/start_listen/cue_points", "/live/song/get/cue_points", updateLocators)

  return setlist
}