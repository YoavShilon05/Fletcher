import {
  Maximize2,
  Mic,
  Magnet,
  Sun,
  QrCode,
  ListMusic,
  ZoomIn,
  ZoomOut,
  LocateFixed,
} from "lucide-react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useLayoutEffect, useRef, useState } from "react";
import { QRModal } from "@/components/QRModal/QRModal";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { CHART_ZOOM_MAX, CHART_ZOOM_MIN, CHART_ZOOM_STEP } from "@/constants";
import { chartZoomAtom, followMeasureAtom } from "@/features/chart/atoms";
import {
  controlTrackIndexAtom,
  countTrackIndexAtom,
  shotCallingAtom,
  snapSelectionAtom,
} from "@/features/performance/atoms";
import { createFletcherTracks, deleteFletcherTracks } from "@/features/performance/clips";
import {
  currentViewAtom,
  fullscreenAtom,
  lightScreenAtom,
  toolbarHeightAtom,
} from "@/features/view/atoms";

// `pointer-events-auto` re-enables clicks on the controls themselves; the
// full-width bar around them stays transparent to the mouse (see the wrapper).
const toolButtonClass =
  "pointer-events-auto text-muted-foreground hover:text-foreground hover:bg-transparent cursor-pointer";

export const Toolbar = () => {
  const [snapSelection, setSnapSelection] = useAtom(snapSelectionAtom);
  const [fullscreen, setFullscreen] = useAtom(fullscreenAtom);
  const [shotCalling, setShotCalling] = useAtom(shotCallingAtom);
  const [lightScreen, setLightScreen] = useAtom(lightScreenAtom);
  const [showQr, setShowQr] = useState<boolean>(false);

  const countTrackIndex = useAtomValue(countTrackIndexAtom);
  const controlTrackIndex = useAtomValue(controlTrackIndexAtom);
  const fletcherTracksExist = countTrackIndex !== -1 && controlTrackIndex !== -1;
  const toggleFletcherTracks = (create: boolean) =>
    create
      ? createFletcherTracks(countTrackIndex, controlTrackIndex)
      : deleteFletcherTracks(countTrackIndex, controlTrackIndex);

  // Zoom + follow only apply to the score views.
  const currentView = useAtomValue(currentViewAtom);
  const showChartTools = currentView === "Chart" || currentView === "Chords";
  const [zoom, setZoom] = useAtom(chartZoomAtom);
  const [follow, setFollow] = useAtom(followMeasureAtom);
  const zoomBy = (factor: number) =>
    setZoom((z) =>
      Math.min(CHART_ZOOM_MAX, Math.max(CHART_ZOOM_MIN, Math.round(z * factor * 100) / 100)),
    );

  // Publish the bar's real height: it wraps onto extra rows on narrow screens,
  // and the view beneath pads by this much so nothing ends up underneath it.
  const barRef = useRef<HTMLDivElement>(null);
  const setToolbarHeight = useSetAtom(toolbarHeightAtom);
  useLayoutEffect(() => {
    const node = barRef.current;
    if (!node) return;
    const update = () => setToolbarHeight(node.getBoundingClientRect().height);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => {
      observer.disconnect();
      setToolbarHeight(0);
    };
  }, [setToolbarHeight]);

  return (
    <div
      ref={barRef}
      // pointer-events-none: the bar spans the full width, so its empty gaps
      // would otherwise block clicks on the view behind it.
      className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-wrap items-start justify-center gap-2 sm:gap-3 select-none w-full p-3 sm:p-5"
    >
      {/* Full screen */}
      <Toggle
        pressed={fullscreen}
        onPressedChange={setFullscreen}
        title="Fullscreen"
        variant="outline"
        size="lg"
        className={toolButtonClass}
      >
        <Maximize2 />
      </Toggle>

      {/* Snap Selection */}
      <Toggle
        pressed={snapSelection}
        onPressedChange={setSnapSelection}
        title="Snap selection"
        variant="outline"
        size="lg"
        className={toolButtonClass}
      >
        <Magnet />
      </Toggle>

      {/* Shot Calling */}
      <Toggle
        pressed={shotCalling}
        onPressedChange={setShotCalling}
        title="Shot calling"
        variant="outline"
        size="lg"
        className={toolButtonClass}
      >
        <Mic />
      </Toggle>

      {/* Light screen */}
      <Toggle
        pressed={lightScreen}
        onPressedChange={setLightScreen}
        title="Beat flash"
        variant="outline"
        size="lg"
        className={toolButtonClass}
      >
        <Sun />
      </Toggle>

      {/* QR */}
      <Button
        onClick={() => setShowQr(true)}
        title="Invite the band"
        variant="outline"
        size="lg"
        className={toolButtonClass}
      >
        <QrCode />
      </Button>

      {/* Fletcher Tracks */}
      <Toggle
        pressed={fletcherTracksExist}
        onPressedChange={toggleFletcherTracks}
        variant="outline"
        size="lg"
        title={fletcherTracksExist ? "Remove Fletcher tracks" : "Create Fletcher tracks"}
        className={toolButtonClass}
      >
        <ListMusic />
      </Toggle>

      {/* Chart/Chords-only: zoom out / in and the jump-to-playing-measure toggle */}
      {showChartTools && (
        <>
          <Button
            onClick={() => zoomBy(1 / CHART_ZOOM_STEP)}
            disabled={zoom <= CHART_ZOOM_MIN}
            variant="outline"
            size="lg"
            title="Zoom out"
            className={toolButtonClass}
          >
            <ZoomOut />
          </Button>

          <Button
            onClick={() => zoomBy(CHART_ZOOM_STEP)}
            disabled={zoom >= CHART_ZOOM_MAX}
            variant="outline"
            size="lg"
            title="Zoom in"
            className={toolButtonClass}
          >
            <ZoomIn />
          </Button>

          <Toggle
            pressed={follow}
            onPressedChange={setFollow}
            variant="outline"
            size="lg"
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
