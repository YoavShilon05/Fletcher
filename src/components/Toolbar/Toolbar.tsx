import {Maximize2, Mic, Magnet, Sun, QrCode, ListMusic, ZoomIn, ZoomOut, LocateFixed} from "lucide-react";
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {
  chartZoomAtom,
  currentViewAtom,
  fletcherControlTrackIndexAtom,
  fletcherCountTrackIndexAtom,
  followMeasureAtom,
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

  // Zoom + follow only apply to the score views.
  const currentView = useAtomValue(currentViewAtom)
  const showChartTools = currentView === 'Chart' || currentView === 'Chords'
  const [zoom, setZoom] = useAtom(chartZoomAtom)
  const [follow, setFollow] = useAtom(followMeasureAtom)
  // Geometric steps feel even across the range; clamp to sane bounds.
  const zoomBy = (factor: number) =>
    setZoom((z) => Math.min(3, Math.max(0.5, Math.round(z * factor * 100) / 100)))

  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-start justify-center gap-2 sm:gap-3 select-none w-full p-3 sm:p-5">
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

      {/* Chart/Chords-only: zoom out / in and the jump-to-playing-measure toggle */}
      {showChartTools && (
        <>
          <Button
            onClick={() => zoomBy(1 / 1.2)}
            disabled={zoom <= 0.5}
            variant="outline" size="lg"
            title="Zoom out"
            className="text-muted-foreground hover:text-foreground hover:bg-transparent cursor-pointer"
          >
            <ZoomOut />
          </Button>

          <Button
            onClick={() => zoomBy(1.2)}
            disabled={zoom >= 3}
            variant="outline" size="lg"
            title="Zoom in"
            className="text-muted-foreground hover:text-foreground hover:bg-transparent cursor-pointer"
          >
            <ZoomIn />
          </Button>

          <Toggle
            pressed={follow}
            onPressedChange={setFollow}
            variant="outline" size="lg"
            title={follow ? "Jump to playing measure: on" : "Jump to playing measure: off"}
            className="text-muted-foreground hover:text-foreground hover:bg-transparent cursor-pointer"
          >
            <LocateFixed />
          </Toggle>
        </>
      )}

      <QRModal open={showQr} onOpenChange={setShowQr} />
    </div>
  );
};