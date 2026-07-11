import {atom} from "jotai";
import {Song} from "@/interfaces/song.ts";
import {SongSection} from "@/interfaces/song-section.ts";
import {Scene} from "@/interfaces/scene.ts";
import {TimeSignature, TimeSignatureChangeEvent} from "@/interfaces/time-signature.ts";


export const setlistAtom = atom<Song[]>()
export const selectedSongAtom = atom<Song>()
export const currentSectionAtom = atom<SongSection>()
export const currentlyPlayingAtom = atom<boolean>(false)
export const currentBeatAtom = atom<number>(0)
export const beatOffsetAtom = atom<number>(0)
export const scenesAtom = atom<Scene[]>([])
export const globalTimeSignatureAtom = atom<TimeSignature>({numerator: 4, denominator: 4})
export const filePathAtom = atom<string>()
export const timeSignatureChangesAtom = atom<TimeSignatureChangeEvent[]>([])
export const fletcherTrackIndexAtom = atom<number>(0)
export const globalTempoAtom = atom<number>(0);
export const delayFromMothershipAtom = atom<number>(0)
export const localIpAtom = atom<string | undefined>()

export const fullscreenAtom = atom<boolean>(false)
export const snapSelectionAtom = atom<boolean>(false)
export const shotCallingAtom = atom<boolean>(true)
export const lightScreenAtom = atom<boolean>(true)
