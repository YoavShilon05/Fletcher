import {atom} from "jotai";
import {atomWithStorage} from "jotai/utils";
import {Song} from "@/interfaces/song.ts";
import {SongSection} from "@/interfaces/song-section.ts";
import {Scene} from "@/interfaces/scene.ts";
import {TimeSignature, TimeSignatureChangeEvent} from "@/interfaces/time-signature.ts";
import {FULL_SCORE_PART_ID} from "@/interfaces/baked-chart.ts";


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
export const fletcherCountTrackIndexAtom = atom<number>(-1)
export const fletcherControlTrackIndexAtom = atom<number>(-1)
export const globalTempoAtom = atom<number>(0);
export const delayFromMothershipAtom = atom<number>(0)

// Which instrument the Chart view shows. Persisted per device so each musician's
// phone remembers their part across songs and restarts. -1 = full score.
export const selectedPartIdAtom = atomWithStorage<number>("fletcher.selectedPartId", FULL_SCORE_PART_ID)
// Bumped on a /broadcast/chart_ready message so followers re-resolve the chart index.
export const chartReadyTickAtom = atom<number>(0)

export const fullscreenAtom = atom<boolean>(false)
export const snapSelectionAtom = atom<boolean>(false)
export const shotCallingAtom = atom<boolean>(true)
export const lightScreenAtom = atom<boolean>(true)
