import {ReactNode, useEffect, useMemo, useState} from "react";
import "./App.css";
import {SongSelector} from "@/components/SongSelector/SongSelector.tsx";
import {SongStructure} from "@/components/SongStructure/SongStructure.tsx";
import {ViewTabs} from "@/components/ViewTabs/ViewTabs.tsx";
import {Toolbar} from "@/components/Toolbar/Toolbar.tsx";
import {ViewType} from "@/interfaces/view-type.ts";
import {useSetlist} from "@/hooks/useSetlist.ts";
import {useSceneSelection} from "@/hooks/useSceneSelection.ts";
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {
  currentBeatAtom,
  currentlyPlayingAtom, currentSectionAtom, delayFromMothershipAtom,
  fletcherTrackIndexAtom, fullscreenAtom,
  selectedSongAtom
} from "@/stores/store.ts";
import {usePropertyListener} from "@/hooks/usePropertyListener.ts";
import {useAutoStop} from "@/hooks/useAutoStop.ts";
import {TitleView} from "@/components/Views/TitleView/TitleView.tsx";
import {ClickView} from "@/components/Views/ClickView/ClickView.tsx";
import {ChartView} from "@/components/Views/ChartView/ChartView.tsx";
import {useSetupGlobalAtoms} from "@/hooks/useSetupGlobalAtoms.ts";
import {useLoopSnapper} from "@/hooks/useLoopSnapper.ts";
import {prepareClips} from "@/utils/prepare-clips.ts";
import {useCueCalls} from "@/hooks/useCueCalls.ts";
import {useFletcherTrack} from "@/hooks/useFletcherTrack.ts";
import {ChordView} from "@/components/Views/ChordView/ChordView.tsx";
import {useSyncTempo} from "@/hooks/useSyncTempo.ts";
import {ConnectionBlock} from "@/components/ConnectionBlock/ConnectionBlock.tsx";
import {useOscListener} from "@/hooks/useOsc.ts";
import {useBroadcastHeartbeat} from "@/hooks/useBroadcastHeartbeat.ts";
import {BROADCAST_HEARTBEAT_ADDRESS} from "@/constants.ts";
import {parseOscPayload} from "@/utils/parse-osc-payload.ts";
// import {useAbletonHeartbeat} from "@/hooks/useAbletonHeartbeat.ts";
import {useSyncCurrentBeat} from "@/hooks/useSyncCurrentBeat.ts";
import {sendOsc} from "@/hooks/useOsc.ts";
import {ViewContainer} from "@/components/Views/ViewContainer.tsx";

function App() {

  const trackIndex = useAtomValue(fletcherTrackIndexAtom)
  useEffect(() => {
    if (trackIndex)
      prepareClips(trackIndex);
  }, [trackIndex]);

  const [selectedSong, setSelectedSong] = useAtom(selectedSongAtom);
  const setlist = useSetlist()
  const setIsPlaying = useSetAtom(currentlyPlayingAtom);
  const setCurrentBeat = useSetAtom(currentBeatAtom);
  const setCurrentSection = useSetAtom(currentSectionAtom);
  const setDelayFromMothership = useSetAtom(delayFromMothershipAtom);
  const fullscreen = useAtomValue(fullscreenAtom)
  const [currentView, setCurrentView] = useState<ViewType>('Title');

  const currentSongIndex = useMemo(
    () => setlist?.findIndex((song) => song.name === selectedSong?.name) ?? -1,
    [setlist, selectedSong]
  );
  const nextSong = useMemo(
    () => (setlist && currentSongIndex >= 0 && currentSongIndex < setlist.length - 1)
      ? setlist[currentSongIndex + 1]
      : undefined,
    [setlist, currentSongIndex]
  );

  useEffect(() => {
    if (!selectedSong) return;
    setCurrentSection(selectedSong.structure.at(0))
  }, [selectedSong]);

  usePropertyListener("/live/song/start_listen/is_playing", "/live/song/get/is_playing", (payload: boolean[]) => {
    const playing = payload[0];
    if (playing) {
      sendOsc("/live/song/stop_listen/beat", [])
    } else {
      sendOsc("/live/song/start_listen/beat", [])
    }
    setIsPlaying(playing);
  })
  usePropertyListener("/live/song/start_listen/beat", "/live/song/get/beat", (payload: number[]) =>
    setCurrentBeat(payload[0])
  )
  useLoopSnapper()
  useAutoStop()
  useFletcherTrack()
  useSceneSelection();
  useCueCalls()
  useSetupGlobalAtoms()
  useSyncTempo()
  useBroadcastHeartbeat()
  useSyncCurrentBeat()

  useOscListener(msg => { //todo: extract to hook
    if (msg.address === BROADCAST_HEARTBEAT_ADDRESS) {
      const payload = parseOscPayload<number[]>(msg.args)
      const delay = Date.now() - payload[0];
      console.log("RECEIVED DELAY", delay)
      setDelayFromMothership(delay)
    }
  })

  // const connected = useAbletonHeartbeat()

  useEffect(() => {
    if (!setlist || setlist.length === 0) {
      setSelectedSong(undefined);
    } else {
      if (!selectedSong) {
        setSelectedSong(setlist[0]);
      }
    }

  }, [setlist, selectedSong]);

  useEffect(() => {
    if (!selectedSong || !setlist) return;
    const setlistReference = setlist.find(song => song.name === selectedSong.name);
    if (!setlistReference) return;
    setSelectedSong(setlistReference);
  }, [setlist]);

  const VIEW_MAP: Record<ViewType, ReactNode> = {
    Title: <TitleView />,
    Click: <ClickView />,
    Chords: <ChordView />,
    Chart: <ChartView />,
  } as const

  const viewComponent = useMemo(() => VIEW_MAP[currentView], [currentView])

  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden">

      {/* 1. Header Layer */}
      <header className="flex flex-col items-center justify-center gap-1 py-3 sm:py-4 shrink-0 border-b border-border/20 px-4 h-30">
        <h1 className="text-white font-mono text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight select-none text-center truncate max-w-full">
          Now playing: {selectedSong?.name}
        </h1>
        {nextSong && (
          <p className="text-muted-foreground font-mono text-[10px] sm:text-[11px] tracking-widest uppercase select-none truncate max-w-full">
            Next: {nextSong.name}
          </p>
        )}
      </header>


      {/* 3. Main Workspace (responsive grid — panels drop off as width narrows) */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[auto_1fr] xl:grid-cols-[auto_1fr_auto] min-h-0 w-full">

        {/* Left Side: Section Structure — hidden below lg */}
        {!fullscreen && <div className="hidden lg:flex h-full items-center border-r border-border/40">
          <SongStructure/>
        </div>}

        {/* Center Canvas: Dynamic presentation area with floating toolbar */}
        <div className="h-full">
          {!fullscreen && <ViewTabs currentView={currentView} onViewChange={setCurrentView}/>}
          <div className={"relative flex flex-col items-center justify-center h-full overflow-y-auto"}>
            <Toolbar/>
            <ViewContainer>{viewComponent}</ViewContainer>
          </div>
        </div>

        {/* Right Side: Setlist selector — hidden below xl */}
        {!fullscreen && <div className="hidden xl:flex h-full border-l border-border/40 overflow-hidden">
          <SongSelector/>
        </div>}

      </main>

      <ConnectionBlock open={false} />
    </div>
  );
}

export default App;