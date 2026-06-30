import React, {useCallback} from "react";
import {SheetViewer} from "@/components/Views/ChartView/SheetViewer.tsx";
import {xml} from "@/components/Views/ChartView/test.ts";
import {currentBeatAtom, selectedSongAtom} from "@/stores/store.ts";
import {useAtomValue} from "jotai";

interface CleanChartViewProps {
  scale?: number;
}

export const ChartView: React.FC<CleanChartViewProps> = ({ scale = 1.7 }) => {

  const beat = useAtomValue(currentBeatAtom)
  const song = useAtomValue(selectedSongAtom)

  const calcCurrentMeasure = useCallback(() => {
    if (!song) return undefined;
    const relativePosition = beat - song.timelineLocation;
    return Math.floor(relativePosition / 4)
  }, [song, beat])

  return (
    <div className="w-full h-full bg-white">
      <SheetViewer
        content={xml}
        activeMeasure={calcCurrentMeasure()}
        zoom={scale}
        extraMarkers={[
          { measure: 1, label: 'Verse' },   // already in XML, just shown as example
          { measure: 9, label: 'Chorus' },
          { measure: 13, label: 'Bridge' }, // injected from outside
        ]}
      />
    </div>
  );
};