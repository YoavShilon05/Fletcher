import {useAtomValue} from "jotai";
import {selectedSongAtom, setlistAtom} from "@/stores/store.ts";
import {useMemo} from "react";


export const useNextSong = () => {
  const setlist = useAtomValue(setlistAtom);
  const selectedSong = useAtomValue(selectedSongAtom)

  return useMemo(
    () => {
      if (!setlist) return undefined;
      const currIndex = setlist.findIndex((song) => song == selectedSong)
      if (currIndex < setlist.length - 1) {
        return setlist[currIndex + 1];
      }
      return null;
    },

    [setlist, selectedSong]
  )
}