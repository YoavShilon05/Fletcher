import {atom} from "jotai";
import {Song} from "@/interfaces/song.ts";
import {SongSection} from "@/interfaces/song-section.ts";


export const setlistAtom = atom<Song[]>()
export const selectedSongAtom = atom<Song>()
export const currentSectionAtom = atom<SongSection>()
export const snapSelectionAtom = atom<boolean>(false)
export const currentlyPlayingAtom = atom<boolean>(false)