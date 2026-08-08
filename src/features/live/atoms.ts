// Mirror of the Ableton Live set's state, written only by the sync hooks in
// this folder. Everything else reads (or derives from) these.

import { atom } from "jotai";
import type { Locator, PlaybackAnchor } from "@/lib/osc/addresses";
import type { Scene } from "@/types/scene";
import type { TempoChangeEvent } from "@/types/tempo";
import type { TimeSignature, TimeSignatureChangeEvent } from "@/types/time-signature";

export const isPlayingAtom = atom(false);
/** Integer beat of the playhead. Extrapolated locally while playing (see useBeatClock). */
export const currentBeatAtom = atom(0);
/** Set when playback starts, cleared when it stops. Drives useBeatClock. */
export const playbackAnchorAtom = atom<PlaybackAnchor | null>(null);

export const locatorsAtom = atom<Locator[]>([]);
export const scenesAtom = atom<Scene[]>([]);
export const trackNamesAtom = atom<string[]>([]);

export const globalTempoAtom = atom(0);
export const globalTimeSignatureAtom = atom<TimeSignature>({ numerator: 4, denominator: 4 });
export const timeSignatureChangesAtom = atom<TimeSignatureChangeEvent[]>([]);
/** The set's tempo envelope, read from the .als — Live exposes no OSC for it. */
export const tempoChangesAtom = atom<TempoChangeEvent[]>([]);
/** Absolute path of the open .als file (host only). */
export const filePathAtom = atom<string>();

/** How far this follower's clock runs ahead of the host's, in ms (0 on the host). */
export const delayFromMothershipAtom = atom(0);
