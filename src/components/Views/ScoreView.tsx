// Shared scaffolding for the two score views (Chart and Chords). Both resolve
// the same baked chart, read the same zoom/follow toolbar state, track the same
// playing measure, and need the same bounded-scroll layout — only what they draw
// inside differs.

import { ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import {
  chartZoomAtom,
  currentBeatAtom,
  followMeasureAtom,
} from '@/stores/store.ts';
import { useBakedChart } from '@/hooks/useBakedChart.ts';
import { calculateMeasure } from '@/utils/calc-current-measure.ts';
import type { BakedChart } from '@/interfaces/baked-chart.ts';
import type { Song } from '@/interfaces/song.ts';

/** Full-bleed placeholder for the loading / missing / error states. */
export function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="w-full h-full bg-white flex items-center justify-center">
      <p className="text-gray-500">{children}</p>
    </div>
  );
}

export type ScoreViewState =
  /** Nothing to draw — render `placeholder` (null means render nothing at all). */
  | { ready: false; placeholder: ReactNode }
  | {
      ready: true;
      chart: BakedChart;
      /** 0-indexed measure currently playing. */
      activeMeasure: number;
      /** Toolbar zoom multiplier, on top of each view's own base scale. */
      zoom: number;
      follow: boolean;
    };

/**
 * Resolve everything a score view needs from the selected song, collapsing the
 * chart's non-ready states into a ready-to-render placeholder.
 */
export function useScoreView(song: Song | undefined): ScoreViewState {
  const chartState = useBakedChart(song);
  const beat = useAtomValue(currentBeatAtom);
  const zoom = useAtomValue(chartZoomAtom);
  const follow = useAtomValue(followMeasureAtom);

  if (!song) return { ready: false, placeholder: null };
  if (chartState.status === 'missing')
    return { ready: false, placeholder: <Centered>Chart not found!</Centered> };
  if (chartState.status === 'error')
    return {
      ready: false,
      placeholder: <Centered>Failed to load chart: {chartState.error}</Centered>,
    };
  if (chartState.status !== 'ready')
    return { ready: false, placeholder: <Centered>Preparing chart…</Centered> };

  return {
    ready: true,
    chart: chartState.chart,
    activeMeasure: Math.floor(calculateMeasure(beat, song)),
    zoom,
    follow,
  };
}

interface ScoreSurfaceProps {
  /** Optional bar above the scroll area (e.g. the Chart part picker). */
  header?: ReactNode;
  /** The scrolling content; it is pinned to the surface, never sizes it. */
  children: ReactNode;
}

/**
 * Bounded page for a score view.
 *
 * `min-h-0` / `overflow-hidden` stop the (arbitrarily tall) score from growing
 * this box, and the absolute inner wrapper pins the scroll container to the
 * remaining slot — so content scrolls *inside* the view instead of stretching
 * the whole app page.
 */
export function ScoreSurface({ header, children }: ScoreSurfaceProps) {
  return (
    <div className="w-full h-full min-w-0 min-h-0 bg-white flex flex-col overflow-hidden">
      {header}
      <div className="relative flex-1 min-h-0 min-w-0">
        <div className="absolute inset-0">{children}</div>
      </div>
    </div>
  );
}
