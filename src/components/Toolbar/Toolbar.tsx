import {Maximize2, Mic, Magnet, Sun} from "lucide-react";
import {useSetAtom} from "jotai";
import {fullscreenAtom, lightScreenAtom, shotCallingAtom, snapSelectionAtom} from "@/stores/store.ts";
import {Toggle} from "@/components/ui/toggle.tsx";

export const Toolbar = () => {

  const setSnapSelection = useSetAtom(snapSelectionAtom)
  const setFullscreen = useSetAtom(fullscreenAtom)
  const setShotCalling = useSetAtom(shotCallingAtom) //todo: implement
  const setLightScreen = useSetAtom(lightScreenAtom)

  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 flex items-start gap-3 select-none w-full p-5">
      {/* Full screen */}
      <Toggle onPressedChange={setFullscreen} variant="outline" size="lg" className="text-muted-foreground hover:text-foreground hover:bg-transparent cursor-pointer">
        <Maximize2 />
      </Toggle>

      {/* Snap Selection */}
      <Toggle onPressedChange={setSnapSelection} variant="outline" size="lg" className="text-muted-foreground hover:text-foreground hover:bg-transparent cursor-pointer">
        <Magnet />
      </Toggle>

      {/* Shot Calling */}
      <Toggle defaultPressed onPressedChange={setShotCalling} variant="outline" size="lg" className="text-muted-foreground hover:text-foreground hover:bg-transparent cursor-pointer">
        <Mic />
      </Toggle>

      {/* Light screen*/}
      <Toggle defaultPressed onPressedChange={setLightScreen} variant="outline" size="lg" className="text-muted-foreground hover:text-foreground hover:bg-transparent cursor-pointer">
        <Sun />
      </Toggle>
    </div>
  );
};