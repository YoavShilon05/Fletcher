import React, {useEffect, useRef, useState} from "react";
import {SheetViewer} from "@/components/Views/ChartView/SheetViewer.tsx";
import {currentBeatAtom, filePathAtom, selectedSongAtom} from "@/stores/store.ts";
import {useAtomValue} from "jotai";
import {calculateMeasure} from "@/utils/calc-current-measure.ts";
import {readFile, exists} from "@tauri-apps/plugin-fs";
import {CHARTS_FOLDER_NAME} from "@/constants.ts";
import {getDirname} from "@/utils/get-dirname.ts";

interface CleanChartViewProps {
  scale?: number;
}

export const ChartView: React.FC<CleanChartViewProps> = ({ scale = 1.7 }) => {

  const beat = useAtomValue(currentBeatAtom)
  const song = useAtomValue(selectedSongAtom)
  const alsFilePath = useAtomValue(filePathAtom)

  const cache = useRef(new Map<string, Promise<string | undefined>>());

  const getXml = async (path: string): Promise<string | undefined> => {
    const existing = cache.current.get(path);
    if (existing) return existing;

    const promise = (async () => {
      if (!(await exists(path))) {
        return undefined;
      }

      const bytes = await readFile(path);
      return new TextDecoder().decode(bytes);
    })();

    cache.current.set(path, promise);
    return promise;
  }

  const [content, setContent] = useState<string>();

  useEffect(() => {
    if (!song || !alsFilePath) {
      setContent(undefined);
      return;
    }

    const path = `${getDirname(alsFilePath)}/${CHARTS_FOLDER_NAME}/${song.name}.musicxml`;

    getXml(path).then(setContent);
  }, [song, alsFilePath]);


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
        extraMarkers={[
          { measure: 1, label: 'Verse' },   // already in XML, just shown as example
          { measure: 9, label: 'Chorus' },
          { measure: 13, label: 'Bridge' }, // injected from outside
        ]}
      />
    </div>
  );
};