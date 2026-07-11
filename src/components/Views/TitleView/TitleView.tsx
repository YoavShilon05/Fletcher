import {useAtomValue} from "jotai";
import {selectedSongAtom} from "@/stores/store.ts";
import {Separator} from "@/components/ui/separator.tsx";

export const TitleView = () => {
  const selectedSong = useAtomValue(selectedSongAtom)

  return (
    <div className="font-mono relative h-full w-full">
      <div className="flex justify-center w-full">
        <div className="fixed top-1/2 -translate-y-1/2 flex flex-col items-center w-3/5">
          <div className="flex flex-col items-center w-full">
            <Separator />
            <div className="w-full text-center my-10">
            <span>
              <span className="text-[clamp(5rem,7vw,7rem)] text-primary leading-tight py-8 mx-5">
                {selectedSong?.name}
              </span>
              {selectedSong?.key && <span className="text-2xl">in</span>}
              <span className="text-[clamp(3rem,5vw,5rem)] mx-5">
                {selectedSong?.key}
              </span>
            </span>
            </div>
            <Separator />
          </div>
        </div>
      </div>

      {selectedSong?.tempo && (
        <div className="flex justify-center w-full">
          <div className="fixed bottom-[10vh] flex flex-col items-center w-1/6 min-w-fit">
            <div className="text-muted-foreground text-4xl tracking-widest my-6 whitespace-nowrap">
              {selectedSong.tempo} BPM
            </div>
            <Separator />
          </div>
        </div>
      )}
    </div>
  );
};