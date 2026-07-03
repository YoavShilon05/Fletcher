import {currentBeatAtom, selectedSongAtom} from "@/stores/store.ts";
import {useAtomValue} from "jotai";
import {calculateMeasure} from "@/utils/calc-current-measure.ts";
import {useChart} from "@/hooks/useChart.ts";
import {SheetViewer} from "@/components/Views/ChartView/SheetViewer.tsx";

interface CleanChartViewProps {
  scale?: number;
}

export const ChartView = ({ scale = 1.7 }: CleanChartViewProps) => {

  const beat = useAtomValue(currentBeatAtom)
  const song = useAtomValue(selectedSongAtom)
  const content = useChart(song)


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
        zoom={3}
        extraMarkers={[
          { measure: 1, label: 'Verse' },   // already in XML, just shown as example
          { measure: 9, label: 'Chorus' },
          { measure: 13, label: 'Bridge' }, // injected from outside
        ]}
      />
    </div>
  );
};