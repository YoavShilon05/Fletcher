import {useAtomValue} from "jotai";
import {selectedSongAtom} from "@/stores/store.ts";
import {Separator} from "@/components/ui/separator.tsx";
import {SongInfo} from "@/components/Views/SongInfo.tsx";

export const TitleView = () => {
  const selectedSong = useAtomValue(selectedSongAtom)

  return (
    <div className="font-mono grid grid-rows-3 h-full w-full">
      <div></div>
      <div className="justify-self-center flex flex-col items-center justify-around w-2/4">
        <Separator />
        <div>
          <p className="text-sm text-card-foreground uppercase tracking-widest mb-2">Now Playing:</p>
          <p className="text-8xl text-primary">{selectedSong?.name}</p>
        </div>
        <Separator />
      </div>
      <SongInfo />
    </div>
  );
};