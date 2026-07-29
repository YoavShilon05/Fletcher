import { useAtomValue } from 'jotai';
import { selectedSongAtom } from '@/stores/store.ts';
import { useChartMusicXml } from '@/hooks/useBakedChart.ts';
import { ChordViewer } from '@/components/Views/ChordView/ChordViewer.tsx';
import { Centered, ScoreSurface, useScoreView } from '@/components/Views/ScoreView.tsx';

export const ChordView = () => {
  const song = useAtomValue(selectedSongAtom);

  // Chords come from the same .mscz as the chart: the bake exports full-score
  // MusicXML, and extract-chords reads its <harmony> symbols.
  const state = useScoreView(song);
  const content = useChartMusicXml(state.ready ? state.chart : undefined);

  if (!state.ready) return state.placeholder;

  return (
    <ScoreSurface>
      {content ? (
        <ChordViewer
          content={content}
          activeMeasure={state.activeMeasure}
          // The grid reads zoom as bars-per-row, so it takes the raw multiplier.
          zoom={state.zoom}
          follow={state.follow}
        />
      ) : (
        <Centered>Preparing chart…</Centered>
      )}
    </ScoreSurface>
  );
};
