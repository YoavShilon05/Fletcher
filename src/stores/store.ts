import {atom} from "jotai";
import {Song} from "@/interfaces/song.ts";
import {SongSection} from "@/interfaces/song-section.ts";
import {Scene} from "@/interfaces/scene.ts";
import {TimeSignature} from "@/interfaces/time-signature.ts";


export const setlistAtom = atom<Song[]>()
export const selectedSongAtom = atom<Song>()
export const currentSectionAtom = atom<SongSection>()
export const snapSelectionAtom = atom<boolean>(false)
export const currentlyPlayingAtom = atom<boolean>(false)
export const currentBeatAtom = atom<number>(0)
export const beatOffsetAtom = atom<number>(390)
export const scenesAtom = atom<Scene[]>([])
export const globalTimeSignatureAtom = atom<TimeSignature>({numerator: 4, denominator: 4})