import { useAtomValue } from 'jotai';
import { selectedSongAtom } from '@/stores/store.ts';
import { useChartMusicXml } from '@/hooks/useBakedChart.ts';
import { ChordViewer } from '@/components/Views/ChordView/ChordViewer.tsx';
import { Centered, ScoreSurface, useScoreView } from '@/components/Views/ScoreView.tsx';

// Base cell scale for the lead-sheet grid; the toolbar zoom multiplies this.
const CHORD_BASE_SCALE = 1.7;

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
          zoom={CHORD_BASE_SCALE * state.zoom}
          follow={state.follow}
        />
      ) : (
        <Centered>Preparing chart…</Centered>
      )}
    </ScoreSurface>
  );
};
