import {ReactNode, useEffect, useMemo, useState} from "react";
import "./App.css";
import {SongSelector} from "@/components/SongSelector/SongSelector.tsx";
import {SongStructure} from "@/components/SongStructure/SongStructure.tsx";
import {ViewSelector} from "@/components/ViewSelector/ViewSelector.tsx";
import {ViewType} from "@/interfaces/view-type.ts";
import {useSetlist} from "@/hooks/useSetlist.ts";
import {useSceneSelection} from "@/hooks/useSceneSelection.ts";
import {useAtom, useAtomValue, useSetAtom} from "jotai";
import {
  currentBeatAtom,
  currentlyPlayingAtom, currentSectionAtom, delayFromMothershipAtom,
  fletcherTrackIndexAtom,
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
  const [currentView, setCurrentView] = useState<ViewType>('Title');

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
      <header className="flex items-center justify-center py-6 shrink-0 border-b border-border/20">
        <h1 className="text-white font-mono text-xl select-none">
          Now playing: {selectedSong?.name}
        </h1>
      </header>

      {/* 2. Main Workspace (Grid layout preventing vertical overflows) */}
      <main className="flex-1 grid grid-cols-[auto_1fr_auto] min-h-0 w-full">

        {/* Left Side: Stretched & vertically aligned Section Selector */}
        <div className="h-full flex items-center border-r border-border/40">
          <SongStructure/>
        </div>

        {/* Center Canvas: Dynamic presentation area */}
        <div className="flex items-center justify-center p-6 min-h-0 overflow-y-auto">
          {viewComponent}
        </div>

        {/* Right Side: Containerless View Buttons centered perfectly */}
        <div className="h-full flex items-center px-4 border-l border-border/40">
          <ViewSelector
            currentView={currentView}
            onViewChange={setCurrentView}
          />
        </div>

      </main>

      {/* 3. Footer Carousel Selector */}
      <footer className="w-full shrink-0">
        <SongSelector/>
      </footer>

      <ConnectionBlock open={false} />
    </div>
  );
}

export default App;
