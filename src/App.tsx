import {ReactNode, useEffect, useMemo, useState} from "react";
import "./App.css";
import {sendOsc} from "./hooks/useOsc.ts";
import {SongSelector} from "@/components/SongSelector/SongSelector.tsx";
import {SongStructure} from "@/components/SongStructure/SongStructure.tsx";
import {ViewSelector} from "@/components/ViewSelector/ViewSelector.tsx";
import {ViewType} from "@/interfaces/view-type.ts";
import {useSetlist} from "@/hooks/useSetlist.ts";
import {useSceneSelection} from "@/hooks/useSceneSelection.ts";
import {useAtom, useSetAtom} from "jotai";
import {currentlyPlayingAtom, currentSectionAtom, selectedSongAtom} from "@/stores/store.ts";
import {usePropertyListener} from "@/hooks/usePropertyListener.ts";
import {useAutoStop} from "@/hooks/useAutoStop.ts";
import {TitleView} from "@/components/Views/TitleView/TitleView.tsx";
import {ClickView} from "@/components/Views/ClickView/ClickView.tsx";
import {ChartView} from "@/components/Views/ChartView/ChartView.tsx";
import {loadAls} from "@/utils/parse-als.ts";
import {parseTimeSignatureEvents} from "@/utils/parse-time-signature-events.ts";


function App() {

  useEffect(() => {
    const foo = async () => {
      const xml =
        await loadAls("C:\\Users\\pc\\Desktop\\FletcherTest Project\\FletcherTest.als")
      //Ableton.LiveSet.MainTrack.AutomationEnvelopes.Envelopes.AutomationEnvelope[0].Automation.Events.EnumEvent
      const timeSignatureEvents = xml.Ableton.LiveSet.MainTrack.AutomationEnvelopes.Envelopes.AutomationEnvelope[0].Automation.Events.EnumEvent
      console.log(xml)
      const result = parseTimeSignatureEvents(timeSignatureEvents.map
        ((event: any) => ({value: event["@_Value"], time: event["@_Time"]}))
      )
      console.log(result)
    }
    foo()
  }, []);

  // const [setlist] = useState<Song[]>(initialSetlist);
  const [selectedSong, setSelectedSong] = useAtom(selectedSongAtom);
  const setlist = useSetlist()
  const setCurrentSection = useSetAtom(currentSectionAtom);
  const setIsPlaying = useSetAtom(currentlyPlayingAtom);
  const [currentView, setCurrentView] = useState<ViewType>('Title');

  usePropertyListener("/live/song/start_listen/is_playing", "/live/song/get/is_playing", (isPlaying: boolean[]) => {
    setIsPlaying(isPlaying[0]);
  })
  useAutoStop()
  useSceneSelection();

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
    setCurrentSection((selectedSong && selectedSong.structure.length > 0) ? selectedSong.structure[0] : undefined);

    if (!selectedSong) return;

    sendOsc(`/live/song/set/start_time`, [selectedSong.timelineLocation])
  }, [selectedSong]);

  useEffect(() => {
    if (!selectedSong || !setlist) return;
    const setlistReference = setlist.find(song => song.name === selectedSong.name);
    if (!setlistReference) return;
    setSelectedSong(setlistReference);
  }, [setlist]);

  const VIEW_MAP: Record<ViewType, ReactNode> = {
    Title: <TitleView />,
    Click: <ClickView />,
    Chords: <TitleView />,
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
          {/*<div className="font-mono text-center opacity-80">*/}
          {/*  /!* Dynamic View rendering container depending on currentView *!/*/}
          {/*  <p className="text-sm text-card-foreground uppercase tracking-widest mb-2">{viewComponent}</p>*/}
          {/*  <p className="text-2xl font-bold text-primary">{currentSection?.name}</p>*/}
          {/*</div>*/}
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

    </div>
  );
}

export default App;
