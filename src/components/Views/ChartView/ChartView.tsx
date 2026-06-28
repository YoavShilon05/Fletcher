import React from "react";
import {SheetViewer} from "@/components/Views/ChartView/SheetViewer.tsx";
import {xml} from "@/components/Views/ChartView/test.ts";

interface CleanChartViewProps {
  scale?: number;
}

export const ChartView: React.FC<CleanChartViewProps> = ({ scale = 1.7 }) => {

  return (
    <div className="w-full h-full bg-white">
      <SheetViewer
        content={xml}
        activeMeasure={1}
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