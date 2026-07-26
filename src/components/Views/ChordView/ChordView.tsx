import { useAtomValue } from 'jotai';
import { chartZoomAtom, currentBeatAtom, followMeasureAtom, selectedSongAtom } from '@/stores/store.ts';
import { useBakedChart, useChartMusicXml } from '@/hooks/useBakedChart.ts';
import { ChordViewer } from '@/components/Views/ChordView/ChordViewer.tsx';
import { calculateMeasure } from '@/utils/calc-current-measure.ts';

// Base cell scale for the lead-sheet grid; the toolbar zoom multiplies this.
const CHORD_BASE_SCALE = 1.7;

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-full bg-white flex items-center justify-center">
      <p className="text-gray-500">{children}</p>
    </div>
  );
}

export const ChordView = () => {
  const beat = useAtomValue(currentBeatAtom);
  const song = useAtomValue(selectedSongAtom);
  const zoom = useAtomValue(chartZoomAtom);
  const follow = useAtomValue(followMeasureAtom);

  // Chords come from the same .mscz as the chart: the bake exports full-score
  // MusicXML, and extract-chords reads its <harmony> symbols.
  const chartState = useBakedChart(song);
  const chart = chartState.status === 'ready' ? chartState.chart : undefined;
  const content = useChartMusicXml(chart);

  if (!song) return null;
  if (chartState.status === 'missing') return <Centered>Chart not found!</Centered>;
  if (chartState.status === 'error') return <Centered>Failed to load chart: {chartState.error}</Centered>;
  if (!content) return <Centered>Preparing chart…</Centered>;

  return (
    <div className="w-full h-full bg-white">
      <ChordViewer
        content={content}
        activeMeasure={Math.floor(calculateMeasure(beat, song))}
        zoom={CHORD_BASE_SCALE * zoom}
        follow={follow}
      />
    </div>
  );
};
