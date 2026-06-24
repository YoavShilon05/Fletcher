import React from 'react';
import { Play } from 'lucide-react';
import {SongSection} from "@/interfaces/song-section.ts";
import {useAtomValue} from "jotai";
import {selectedSongAtom} from "@/stores/store.ts";

interface SectionSelectorProps {
  currentSection?: SongSection;
  onSectionSelect?: (section: SongSection) => void;
}

export const SectionSelector: React.FC<SectionSelectorProps> = ({
                                                                  currentSection,
                                                                  onSectionSelect,
                                                                }) => {

  const selectedSong = useAtomValue(selectedSongAtom)
  const structure = selectedSong?.structure || []

  return (
    <aside className="w-48 h-full flex flex-col bg-background border-r border-border font-mono p-4 select-none">
      {/* Sidebar Header */}
      <div className="text-[10px] tracking-widest uppercase text-card-foreground mb-4">
        Structure
      </div>

      {/* Dynamic spaced out vertical track */}
      <div className="flex-1 flex flex-col justify-evenly relative py-2">
        {/* Subtle background timeline line */}
        <div className="absolute left-2.5 top-4 bottom-4 w-[1px] bg-border/60 pointer-events-none" />

        {structure.map((section, idx) => {
          const isActive = currentSection?.timelineLocation === section.timelineLocation;

          return (
            <button
              key={`${section.name}-${idx}`}
              onClick={() => onSectionSelect?.(section)}
              className="group flex items-center gap-3 text-left w-full cursor-pointer focus:outline-none transition-colors"
            >
              {/* Indicator Node */}
              <div
                className={`w-5 h-5 rounded-sm flex items-center justify-center border transition-all z-10 bg-background
                  ${isActive
                  ? 'border-primary text-primary shadow-[0_0_8px_var(--juke-glow)]'
                  : 'border-border text-muted group-hover:border-muted-foreground'
                }`}
              >
                <Play className={`h-2.5 w-2.5 fill-current transition-transform ${isActive ? 'scale-100' : 'scale-0 group-hover:scale-75 text-muted-foreground'}`} />
              </div>

              {/* Section Name label */}
              <span
                className={`text-xs capitalize tracking-wide transition-colors truncate
                  ${isActive
                  ? 'text-foreground font-bold'
                  : 'text-card-foreground group-hover:text-muted-foreground'
                }`}
              >
                {section.name}
              </span>
            </button>
          );
        })}

        {/* Fallback empty state */}
        {structure.length === 0 && (
          <div className="text-xs text-muted/50 italic self-center justify-self-center">
            No sections defined
          </div>
        )}
      </div>
    </aside>
  );
};