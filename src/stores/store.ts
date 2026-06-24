import {atom} from "jotai";
import {Song} from "@/interfaces/song.ts";


export const setlistAtom = atom<Song[]>()
export const selectedSongAtom = atom<Song>()