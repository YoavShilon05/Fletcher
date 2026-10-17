import { useAtomValue } from "jotai";
import { ChordViewer } from "@/components/Views/ChordView/ChordViewer";
import { Centered, ScoreSurface } from "@/components/Views/ScoreView";
import { useScoreView } from "@/components/Views/useScoreView";
import { useChartMusicXml } from "@/features/chart/useBakedChart";
import { selectedSongAtom } from "@/features/setlist/atoms";

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
