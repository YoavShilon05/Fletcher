import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { FULL_SCORE_PART_ID } from "@/lib/webmscore/types";

// Which instrument the Chart view shows. Persisted per device so each musician's
// phone remembers their part across songs and restarts. -1 = full score.
export const selectedPartIdAtom = atomWithStorage<number>(
  "fletcher.selectedPartId",
  FULL_SCORE_PART_ID,
);

// Bumped on a chart_ready broadcast so followers re-resolve the chart index.
export const chartReadyTickAtom = atom(0);

// Zoom multiplier applied on top of each chart view's own base scale (Chart is
// fit-to-width, Chords has a base cell size). Shared by both views and driven by
// the toolbar's +/- buttons. Persisted per device.
export const chartZoomAtom = atomWithStorage<number>("fletcher.chartZoom", 1);

// When on, Chart/Chords auto-scroll to keep the playing measure in view (ahead
// of time, so the next systems stay visible). Persisted per device.
export const followMeasureAtom = atomWithStorage<boolean>("fletcher.followMeasure", true);
