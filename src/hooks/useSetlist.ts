import {Song} from "@/interfaces/song.ts";
import {SectionNames, STOP_SONG} from "@/interfaces/song-section.ts";
import {useAtom} from "jotai";
import {setlistAtom} from "@/stores/store.ts";
import {usePropertyListener} from "@/hooks/usePropertyListener.ts";

export const useSetlist = () => {

  const [setlist, setSetlist] = useAtom(setlistAtom);

  const updateSetlist = (payload: (number | string)[]) => {
    const locators: {name: string, location: number}[] = []
    for (let i = 0; i < payload.length; i += 2) {
      locators.push({
        name: payload[i] as string,
        location: payload[i + 1] as number,
      });
    }

    const songs: Song[] = []

    for (const locator of locators.sort((a, b) => a.location - b.location)) {
      const lastSong = songs.at(-1)

      if (locator.name === STOP_SONG) {        if (!lastSong) return;
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

      else {
        songs.push({
          name: locator.name,
          timelineLocation: locator.location,
          bpm: 100,
          timeSignature: {
            numerator: 4,
            denominator: 4,
          },
          structure: [{
            name: SectionNames.INTRO,
            timelineLocation: locator.location
          }],
          key: "Am"
        })
      }

    }

    setSetlist(songs);
  };

  usePropertyListener("/live/song/start_listen/cue_points", "/live/song/get/cue_points", updateSetlist)

  return setlist
}