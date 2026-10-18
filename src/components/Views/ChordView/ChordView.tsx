import { useAtomValue } from "jotai";
import { ChordViewer } from "@/components/Views/ChordView/ChordViewer";
import { Centered, ScoreSurface } from "@/components/Views/ScoreView";
import { useScoreView } from "@/components/Views/useScoreView";
import { elementIndexFor } from "@/features/chart/measure-map";
import { useChartMusicXml, useChartPositions } from "@/features/chart/useBakedChart";
import { selectedSongAtom } from "@/features/setlist/atoms";
import { FULL_SCORE_PART_ID } from "@/lib/webmscore/types";

export const ChordView = () => {
  const song = useAtomValue(selectedSongAtom);

  // Chords come from the same .mscz as the chart: the bake exports full-score
  // MusicXML, and extract-chords reads its <harmony> symbols.
  const state = useScoreView(song);
  const chart = state.ready ? state.chart : undefined;
  const content = useChartMusicXml(chart);

  // The grid has one cell per written measure; the timeline counts played ones
  // (repeats unrolled). The full score's boxes are its written measures, so its
  // measure map converts one to the other.
  const fullPositions = useChartPositions(chart, FULL_SCORE_PART_ID);

  if (!state.ready) return state.placeholder;

  const played = state.activeMeasure;
  const written = played != null && fullPositions ? elementIndexFor(fullPositions, played) : played;

  return (
    <ScoreSurface>
      {content ? (
        <ChordViewer
          content={content}
          activeMeasure={written != null && written >= 0 ? written : undefined}
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
