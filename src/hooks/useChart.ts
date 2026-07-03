import {useAtomValue} from "jotai";
import {filePathAtom} from "@/stores/store.ts";
import {useEffect, useRef, useState} from "react";
import {exists, readFile} from "@tauri-apps/plugin-fs";
import {getDirname} from "@/utils/get-dirname.ts";
import {CHARTS_FOLDER_NAME} from "@/constants.ts";
import {Song} from "@/interfaces/song.ts";

export const useChart = (song: Song | undefined) => {
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

  return content;
}