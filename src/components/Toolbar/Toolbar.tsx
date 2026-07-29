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
  snapSelectionAtom,
  toolbarHeightAtom
} from "@/stores/store.ts";
import {Toggle} from "@/components/ui/toggle.tsx";
import {Button} from "@/components/ui/button.tsx";
import {useLayoutEffect, useRef, useState} from "react";
import {QRModal} from "@/components/QRModal/QRModal.tsx";
import {createFletcherTracks, deleteFletcherTracks} from "@/hooks/useFletcherTrack.ts";

// `pointer-events-auto` re-enables clicks on the controls themselves; the
// full-width bar around them stays transparent to the mouse (see the wrapper).
const toolButtonClass =
  "pointer-events-auto text-muted-foreground hover:text-foreground hover:bg-transparent cursor-pointer"

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

  // Publish the bar's real height: it wraps onto extra rows on narrow screens,
  // and the view beneath pads by this much so nothing ends up underneath it.
  const barRef = useRef<HTMLDivElement>(null)
  const setToolbarHeight = useSetAtom(toolbarHeightAtom)
  useLayoutEffect(() => {
    const node = barRef.current
    if (!node) return
    const update = () => setToolbarHeight(node.getBoundingClientRect().height)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => {
      observer.disconnect()
      setToolbarHeight(0)
    }
  }, [setToolbarHeight])

  return (
    <div
      ref={barRef}
      // pointer-events-none: the bar spans the full width, so its empty gaps
      // would otherwise block clicks on the view behind it.
      className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-wrap items-start justify-center gap-2 sm:gap-3 select-none w-full p-3 sm:p-5"
    >
      {/* Full screen */}
      <Toggle onPressedChange={setFullscreen} variant="outline" size="lg" className={toolButtonClass}>
        <Maximize2 />
      </Toggle>

      {/* Snap Selection */}
      <Toggle onPressedChange={setSnapSelection} variant="outline" size="lg" className={toolButtonClass}>
        <Magnet />
      </Toggle>

      {/* Shot Calling */}
      <Toggle defaultPressed onPressedChange={setShotCalling} variant="outline" size="lg" className={toolButtonClass}>
        <Mic />
      </Toggle>

      {/* Light screen */}
      <Toggle defaultPressed onPressedChange={setLightScreen} variant="outline" size="lg" className={toolButtonClass}>
        <Sun />
      </Toggle>

      {/* QR */}
      <Button onClick={() => setShowQr(true)} variant="outline" size="lg" className={toolButtonClass}>
        <QrCode />
      </Button>

      {/* Fletcher Tracks */}
      <Toggle
        pressed={fletcherTracksExist}
        onPressedChange={pressed => pressed ? createFletcherTracks() : deleteFletcherTracks()}
        variant="outline" size="lg"
        title={fletcherTracksExist ? "Remove Fletcher tracks" : "Create Fletcher tracks"}
        className={toolButtonClass}
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
            className={toolButtonClass}
          >
            <ZoomOut />
          </Button>

          <Button
            onClick={() => zoomBy(1.2)}
            disabled={zoom >= 3}
            variant="outline" size="lg"
            title="Zoom in"
            className={toolButtonClass}
          >
            <ZoomIn />
          </Button>

          <Toggle
            pressed={follow}
            onPressedChange={setFollow}
            variant="outline" size="lg"
            title={follow ? "Jump to playing measure: on" : "Jump to playing measure: off"}
            className={toolButtonClass}
          >
            <LocateFixed />
          </Toggle>
        </>
      )}

      <QRModal open={showQr} onOpenChange={setShowQr} />
    </div>
  );
};