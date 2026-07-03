import {currentBeatAtom, selectedSongAtom} from "@/stores/store.ts";
import {useAtomValue} from "jotai";
import {calculateMeasure} from "@/utils/calc-current-measure.ts";
import {useChart} from "@/hooks/useChart.ts";
import {SheetViewer} from "@/components/Views/ChartView/SheetViewer.tsx";
import {useMemo} from "react";

interface CleanChartViewProps {
  scale?: number;
}

export const ChartView = ({ scale = 1.7 }: CleanChartViewProps) => {

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
      <SheetViewer
        content={content}
        activeMeasure={Math.floor(calculateMeasure(beat, song))}
        zoom={scale}
        extraMarkers={extraMarkers}
      />
    </div>
  );
};