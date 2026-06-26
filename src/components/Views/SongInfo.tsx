import {Separator} from "@/components/ui/separator.tsx";
import {useAtomValue} from "jotai";
import {selectedSongAtom} from "@/stores/store.ts";
import {useNextSong} from "@/hooks/useNextSong.ts";

export const SongInfo = () => {

  const selectedSong = useAtomValue(selectedSongAtom)
  const nextSong = useNextSong();

  return (
    <div className="grid grid-cols-3 gap-32 items-end mb-10 mx-32">
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-end mb-5">
          <span className="text-8xl mx-3">{selectedSong?.bpm}</span>
          <span className="mb-3">bpm</span>
        </div>
        <Separator />
      </div>
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-end mb-5">
          <span className="text-8xl mx-3">{selectedSong?.key}</span>
          <span className="mb-3">key</span>
        </div>
        <Separator />
      </div>
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-end mb-5">
          <span className={`text-6xl mx-3 italic ${nextSong ? "text-primary" : "text-success"}`}>{nextSong?.name ?? "Final"}</span>
          <span className={`mb-1 ${!nextSong && "text-success"}`}>{nextSong ? "next" : "song"}</span>
        </div>
        <Separator />
      </div>
    </div>

  );
};