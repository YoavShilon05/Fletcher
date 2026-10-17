import { useAtomValue } from "jotai";
import type { ReactNode } from "react";
import { Centered } from "@/components/Views/ScoreView";
import { chartZoomAtom, followMeasureAtom } from "@/features/chart/atoms";
import type { BakedChart } from "@/features/chart/types";
import { useBakedChart } from "@/features/chart/useBakedChart";
import { currentBeatAtom } from "@/features/live/atoms";
import { calculateMeasure } from "@/features/music/measure";
import { timeSignatureContextAtom } from "@/features/music/time-signature";
import type { Song } from "@/types/song";

export type ScoreViewState =
  /** Nothing to draw — render `placeholder` (null means render nothing at all). */
  | { ready: false; placeholder: ReactNode }
  | {
      ready: true;
      chart: BakedChart;
      /** 0-indexed measure currently playing; undefined through the count-in. */
      activeMeasure: number | undefined;
      /** Toolbar zoom multiplier, on top of each view's own base scale. */
      zoom: number;
      follow: boolean;
    };

/**
 * Resolve everything a score view needs from the selected song, collapsing the
 * chart's non-ready states into a ready-to-render placeholder.
 */
export function useScoreView(song: Song | undefined): ScoreViewState {
  const chartState = useBakedChart(song?.name);
  const beat = useAtomValue(currentBeatAtom);
  const timeSignatures = useAtomValue(timeSignatureContextAtom);
  const zoom = useAtomValue(chartZoomAtom);
  const follow = useAtomValue(followMeasureAtom);

  if (!song) return { ready: false, placeholder: null };
  if (chartState.status === "missing")
    return { ready: false, placeholder: <Centered>Chart not found!</Centered> };
  if (chartState.status === "error")
    return {
      ready: false,
      placeholder: <Centered>Failed to load chart: {chartState.error}</Centered>,
    };
  if (chartState.status !== "ready")
    return { ready: false, placeholder: <Centered>Preparing chart…</Centered> };

  // Measures run negative through the count-in — nothing to highlight until the
  // chart starts.
  const measure = Math.floor(calculateMeasure(timeSignatures, song, beat));

  return {
    ready: true,
    chart: chartState.chart,
    activeMeasure: measure >= 0 ? measure : undefined,
    zoom,
    follow,
  };
}
