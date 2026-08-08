import { Separator } from "@/components/ui/separator";

/** Tempo read off an envelope is a float: 69.5 stays "69.5", 120 doesn't gain ".0". */
const formatBpm = (tempo: number) => String(Number(tempo.toFixed(1)));

/** Big BPM readout pinned near the bottom of the Title and Click views. */
export const TempoFooter = ({ tempo }: { tempo: number }) => (
  <div className="flex justify-center w-full">
    <div className="absolute bottom-[10vh] flex flex-col items-center w-1/6 min-w-fit">
      <div className="text-muted-foreground text-4xl tracking-widest my-6 whitespace-nowrap">
        {formatBpm(tempo)} BPM
      </div>
      <Separator />
    </div>
  </div>
);
