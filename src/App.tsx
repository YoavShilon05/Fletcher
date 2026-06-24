import {useCallback, useEffect, useState} from "react";
import "./App.css";
import {sendOsc, useOscListener} from "./hooks/useOsc.ts";
import {Song} from "@/interfaces/song.ts";
import {SongSelector} from "@/components/SongSelector/SongSelector.tsx";
import {SectionSelector} from "@/components/SectionSelector/SectionSelector.tsx";
import {ViewSelector} from "@/components/ViewSelector/ViewSelector.tsx";
import {SongSection} from "@/interfaces/song-section.ts";
import {ViewType} from "@/interfaces/view-type.ts";
import {useSetlist} from "@/hooks/useSetlist.ts";
import {useSceneSelection} from "@/hooks/useSceneSelection.ts";
const initialSetlist: Song[] = [
  {
    name: "Enter Sandman",
    bpm: 123,
    key: "Em",
    structure: [{ name: "Intro" }, { name: "Verse 1" }, { name: "Chorus" }, { name: "Guitar Solo" }, { name: "Outro" }]
  },
  {
    name: "Comfortably Numb",
    bpm: 63,
    key: "Bm",
    structure: [{ name: "Intro" }, { name: "Verse" }, { name: "Chorus" }, { name: "Solo 1" }, { name: "Solo 2" }]
  }
];


function App() {


  // const [setlist] = useState<Song[]>(initialSetlist);
  const [selectedSong, setSelectedSong] = useState<Song>(initialSetlist[0]);
  const [currentSection, setCurrentSection] = useState<SongSection>(initialSetlist[0].structure[0]);
  const [currentView, setCurrentView] = useState<ViewType>('Title');

  const setlist = useSetlist()
  useSceneSelection((songName) => {
    const song = setlist.find(song => song.name === songName)
    if (song) {
      setSelectedSong(song)
    }
  });

  useEffect(() => {
    console.log(`jumping to ${selectedSong.name}`);
    sendOsc(`/live/song/cue_point/jump`, [selectedSong.name])
  }, [selectedSong]);

  // Automatically reset to the first section when swapping songs
  const handleSongSelect = (song: Song) => {
    setSelectedSong(song);
    if (song.structure?.length > 0) {
      setCurrentSection(song.structure[0]);
    }
  };

  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden">

      {/* 1. Header Layer */}
      <header className="flex items-center justify-center py-6 shrink-0 border-b border-border/20">
        <h1 className="text-white font-mono text-xl select-none">
          Now playing: {selectedSong.name}
        </h1>
      </header>

      {/* 2. Main Workspace (Grid layout preventing vertical overflows) */}
      <main className="flex-1 grid grid-cols-[auto_1fr_auto] min-h-0 w-full">

        {/* Left Side: Stretched & vertically aligned Section Selector */}
        <div className="h-full flex items-center border-r border-border/40">
          <SectionSelector
            selectedSong={selectedSong}
            currentSection={currentSection}
            onSectionSelect={setCurrentSection}
          />
        </div>

        {/* Center Canvas: Dynamic presentation area */}
        <div className="flex items-center justify-center p-6 min-h-0 overflow-y-auto">
          <div className="font-mono text-center opacity-80">
            {/* Dynamic View rendering container depending on currentView */}
            <p className="text-sm text-card-foreground uppercase tracking-widest mb-2">{currentView} View</p>
            <p className="text-2xl font-bold text-primary">{currentSection?.name}</p>
          </div>
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
        <SongSelector
          setlist={setlist}
          selectedSong={selectedSong}
          onSelect={handleSongSelect}
        />
      </footer>

    </div>
  );
}

export default App;
