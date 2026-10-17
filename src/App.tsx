import { useAtom, useAtomValue } from "jotai";
import type { ComponentType } from "react";
import { Controllers } from "@/app/Controllers";
import { AppHeader } from "@/components/AppHeader/AppHeader";
import { SongSelector } from "@/components/SongSelector/SongSelector";
import { SongStructure } from "@/components/SongStructure/SongStructure";
import { Toolbar } from "@/components/Toolbar/Toolbar";
import { ViewTabs } from "@/components/ViewTabs/ViewTabs";
import { ChartView } from "@/components/Views/ChartView/ChartView";
import { ChordView } from "@/components/Views/ChordView/ChordView";
import { ClickView } from "@/components/Views/ClickView/ClickView";
import { TitleView } from "@/components/Views/TitleView/TitleView";
import { ViewContainer } from "@/components/Views/ViewContainer";
import { currentViewAtom, fullscreenAtom } from "@/features/view/atoms";
import type { ViewType } from "@/types/view-type";

const VIEWS: Record<ViewType, ComponentType> = {
  Title: TitleView,
  Click: ClickView,
  Chords: ChordView,
  Chart: ChartView,
};

function App() {
  const fullscreen = useAtomValue(fullscreenAtom);
  const [currentView, setCurrentView] = useAtom(currentViewAtom);
  const View = VIEWS[currentView];

  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden">
      <Controllers />

      {!fullscreen && <AppHeader />}

      {/* Responsive grid — side panels drop off as the width narrows */}
      <main
        className={`flex-1 grid min-h-0 w-full ${
          fullscreen
            ? "grid-cols-1"
            : "grid-cols-1 lg:grid-cols-[auto_1fr] xl:grid-cols-[auto_1fr_auto]"
        }`}
      >
        {/* Left: section structure — hidden below lg */}
        {!fullscreen && (
          <div className="hidden lg:flex h-full items-center border-r border-border/40">
            <SongStructure />
          </div>
        )}

        {/* Center: the active view, with the floating toolbar over it */}
        <div className="h-full w-full!">
          {!fullscreen && <ViewTabs currentView={currentView} onViewChange={setCurrentView} />}
          <div className="relative flex flex-col items-center justify-center h-full w-full overflow-y-auto">
            <Toolbar />
            <ViewContainer>
              <View />
            </ViewContainer>
          </div>
        </div>

        {/* Right: setlist — hidden below xl */}
        {!fullscreen && (
          <div className="hidden xl:flex h-full border-l border-border/40 overflow-hidden">
            <SongSelector />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
