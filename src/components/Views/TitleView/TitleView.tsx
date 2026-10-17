import { useAtomValue } from "jotai";
import { Separator } from "@/components/ui/separator";
import { TempoFooter } from "@/components/Views/TempoFooter";
import { selectedSongAtom } from "@/features/setlist/atoms";

export const TitleView = () => {
  const selectedSong = useAtomValue(selectedSongAtom);

  return (
    <div className="font-mono relative h-full w-full">
      <div className="flex justify-center w-full">
        <div className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center w-3/5">
          <div className="flex flex-col items-center w-full">
            <Separator />
            <div className="w-full text-center my-10">
              <span>
                <span className="text-[clamp(3rem,7vw,7rem)] text-primary leading-tight py-8 mx-5">
                  {selectedSong?.name}
                </span>
                {selectedSong?.key && (
                  <>
                    <span className="text-2xl">in</span>
                    <span className="text-[clamp(2rem,5vw,5rem)] mx-5">{selectedSong.key}</span>
                  </>
                )}
              </span>
            </div>
            <Separator />
          </div>
        </div>
      </div>

      {selectedSong?.tempo ? <TempoFooter tempo={selectedSong.tempo} /> : null}
    </div>
  );
};
