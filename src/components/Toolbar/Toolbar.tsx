import {Maximize2, Mic, Magnet, Sun, QrCode, ListMusic} from "lucide-react";
import {useAtomValue, useSetAtom} from "jotai";
import {
  fletcherControlTrackIndexAtom,
  fletcherCountTrackIndexAtom,
  fullscreenAtom,
  lightScreenAtom,
  shotCallingAtom,
  snapSelectionAtom
} from "@/stores/store.ts";
import {Toggle} from "@/components/ui/toggle.tsx";
import {Button} from "@/components/ui/button.tsx";
import {useState} from "react";
import {QRModal} from "@/components/QRModal/QRModal.tsx";
import {createFletcherTracks, deleteFletcherTracks} from "@/hooks/useFletcherTrack.ts";

export const Toolbar = () => {

  const setSnapSelection = useSetAtom(snapSelectionAtom)
  const setFullscreen = useSetAtom(fullscreenAtom)
  const setShotCalling = useSetAtom(shotCallingAtom)
  const setLightScreen = useSetAtom(lightScreenAtom)
  const [showQr, setShowQr] = useState<boolean>(false);

  const countTrackIndex = useAtomValue(fletcherCountTrackIndexAtom)
  const controlTrackIndex = useAtomValue(fletcherControlTrackIndexAtom)
  const fletcherTracksExist = countTrackIndex !== -1 && controlTrackIndex !== -1

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

      {/* Light screen */}
      <Toggle defaultPressed onPressedChange={setLightScreen} variant="outline" size="lg" className="text-muted-foreground hover:text-foreground hover:bg-transparent cursor-pointer">
        <Sun />
      </Toggle>

      {/* QR */}
      <Button onClick={() => setShowQr(true)} variant="outline" size="lg" className="text-muted-foreground hover:text-foreground hover:bg-transparent cursor-pointer">
        <QrCode />
      </Button>

      {/* Fletcher Tracks */}
      <Toggle
        pressed={fletcherTracksExist}
        onPressedChange={pressed => pressed ? createFletcherTracks() : deleteFletcherTracks()}
        variant="outline" size="lg"
        title={fletcherTracksExist ? "Remove Fletcher tracks" : "Create Fletcher tracks"}
        className="text-muted-foreground hover:text-foreground hover:bg-transparent cursor-pointer"
      >
        <ListMusic />
      </Toggle>

      <QRModal open={showQr} onOpenChange={setShowQr} />
    </div>
  );
};