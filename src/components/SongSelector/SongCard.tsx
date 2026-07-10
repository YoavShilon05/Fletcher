import React from 'react';
import { Card } from '@/components/ui/card';
import {Song} from "@/interfaces/song.ts";

interface SongCardProps {
  song: Song;
  status: 'selected' | 'adjacent' | 'default';
  onClick: () => void;
}

export const SongCard: React.FC<SongCardProps> = ({ song, status, onClick }) => {
  const isSelected = status === 'selected';
  const isAdjacent = status === 'adjacent';

  return (
    <Card
      onClick={onClick}
      className={`
        relative flex flex-col justify-between h-25 w-[116px] shrink-0 p-2.5 font-mono cursor-pointer transition-all duration-200
        before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-muted
        ${isSelected ? 'bg-[#14141f] border-primary/60 shadow-[0_0_18px_var(--juke-glow)] -translate-y-1 scale-105 z-10 before:bg-primary before:shadow-[0_0_6px_var(--primary)]' : 'hover:border-primary/40'}
        ${isAdjacent ? '-translate-y-0.5 scale-[1.015] opacity-85' : ''}
      `}
    >
      {/* Target Vinyl Icon Decal */}
      <div className={`absolute top-3 right-2 w-7 h-7 rounded-full bg-[var(--juke-label-bg)] border border-[var(--juke-label-lines)] flex items-center justify-center text-[8px] transition-opacity duration-200 ${isSelected ? 'opacity-25' : 'opacity-15'}`}>
        ●
      </div>

      {/* Song Title */}
      <div className={`text-xs font-bold max-w-[85px] truncate ${isSelected ? 'text-foreground' : isAdjacent ? 'text-[#8888aa]' : 'text-muted'}`}>
        {song.name}
      </div>

      {/* Meta Indicators */}
      <div className="flex flex-col gap-0.5">
        <div className={`text-lg font-bold ${isSelected ? 'text-primary [text-shadow:0_0_8px_rgba(255,107,53,0.5)]' : isAdjacent ? 'text-[#5a5a8a]' : 'text-muted'}`}>
          {song.key}
        </div>
        <div className={`text-[10px] tracking-wide ${isSelected ? 'text-secondary' : 'text-card-foreground'}`}>
          {song.tempo} BPM
        </div>
      </div>
    </Card>
  );
};