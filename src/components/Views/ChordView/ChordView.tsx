import {useAtomValue} from "jotai";
import {currentBeatAtom, selectedSongAtom} from "@/stores/store.ts";
import {useChart} from "@/hooks/useChart.ts";
import {ChordViewer} from "@/components/Views/ChordView/ChordViewer.tsx";
import {calculateMeasure} from "@/utils/calc-current-measure.ts";
import {useMemo} from "react";

interface ChordViewProps {
  scale?: number;
}

export const ChordView = ({scale = 1.7}: ChordViewProps) => {
  const beat = useAtomValue(currentBeatAtom)
  const song = useAtomValue(selectedSongAtom)
  const content = useChart(song)

  const extraMarkers = useMemo(() => {
    if (!song) return [];
    return song.structure.map((section) => ({
      measure: calculateMeasure(section.timelineLocation, song) + 1,
      label: section.name,
    }));
  }, [song]);

  if (!song) return null;

  if (!content) return (
    <div className="w-full h-full bg-white flex items-center justify-center">
      <p className="text-gray-500">Chart not found!</p>
    </div>
  );

  return (
    <div className="w-full h-full bg-white">
      <ChordViewer
        content={content}
        activeMeasure={Math.floor(calculateMeasure(beat, song))}
        zoom={scale}
        extraMarkers={extraMarkers}
      />
    </div>
  );
};