import {useAtomValue} from "jotai";
import {selectedSongAtom} from "@/stores/store.ts";
import {Separator} from "@/components/ui/separator.tsx";
import {SongInfo} from "@/components/Views/SongInfo.tsx";

export const TitleView = () => {
  const selectedSong = useAtomValue(selectedSongAtom)

  return (
    <div className="font-mono grid grid-rows-[1fr_auto_1fr] h-full w-full">
      <div></div>
      <div className="justify-self-center flex flex-col items-center justify-around w-3/5">
        <Separator />
        <div className="w-full">
          <p className="text-[clamp(6rem,7vw,7rem)] text-primary text-center leading-tight py-8">
            {selectedSong?.name}
          </p>
        </div>
        <Separator />
      </div>
      <SongInfo />
    </div>
  );
};