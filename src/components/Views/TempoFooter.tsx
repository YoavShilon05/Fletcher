import { Separator } from "@/components/ui/separator";

/** Big BPM readout pinned near the bottom of the Title and Click views. */
export const TempoFooter = ({ tempo }: { tempo: number }) => (
  <div className="flex justify-center w-full">
    <div className="absolute bottom-[10vh] flex flex-col items-center w-1/6 min-w-fit">
      <div className="text-muted-foreground text-4xl tracking-widest my-6 whitespace-nowrap">
        {tempo} BPM
      </div>
      <Separator />
    </div>
  </div>
);
