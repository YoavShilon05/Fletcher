import { atom } from "jotai";
import type { ViewType } from "@/types/view-type";

export const fullscreenAtom = atom(false);
/** Flash the view background on every beat while playing. */
export const lightScreenAtom = atom(true);

// Which presentation view is active. Lifted to an atom so the floating toolbar
// can show view-specific controls (zoom / follow) only in Chart & Chords.
export const currentViewAtom = atom<ViewType>("Title");

// Measured height of the floating toolbar. It's absolutely positioned over the
// view canvas, and on a narrow screen (phone) it wraps onto several rows — so
// the views below have to reserve exactly this much room or the toolbar covers
// (and swallows clicks on) their top controls.
export const toolbarHeightAtom = atom(0);
