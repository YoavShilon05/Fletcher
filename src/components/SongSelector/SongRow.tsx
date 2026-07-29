import React from 'react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Song } from '@/interfaces/song.ts';

export type SongRowStatus = 'selected' | 'adjacent' | 'default';

interface SongRowProps {
  song: Song;
  status: SongRowStatus;
  onClick: () => void;
}

export const SongRow: React.FC<SongRowProps> = ({ song, status, onClick }) => {
  const isSelected = status === 'selected';
  const isAdjacent = status === 'adjacent';

  return (
    <Card
      data-slot="song-row"
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      size="sm"
      className={cn(
        'w-full shrink-0 cursor-pointer rounded-none border-y border-transparent bg-transparent shadow-none ring-0 transition-all duration-300',
        'focus-visible:outline-none focus-visible:border-primary/40',
        isSelected && 'border-primary/25 bg-[#14141f]',
        isAdjacent && 'opacity-85',
        !isSelected && !isAdjacent && 'opacity-60',
      )}
    >
      {/* Title — spans the full width of the row */}
      <CardHeader>
        <CardTitle
          className={cn(
            'w-full truncate text-center font-mono text-xs font-bold tracking-widest uppercase transition-colors duration-300',
            isSelected ? 'text-foreground' : isAdjacent ? 'text-card-foreground' : 'text-muted',
          )}
        >
          {song.name}
        </CardTitle>
      </CardHeader>

      {/* Record disc */}
      <CardContent>
        <div className="mx-auto w-1/2">
          <AspectRatio ratio={1}>
            <div
              className={cn(
                'relative size-full rounded-full transition-all duration-300',
                'bg-[repeating-radial-gradient(circle,#20202e_0px,#20202e_2px,#15151f_3px,#15151f_5px)]',
                'ring-1 ring-inset ring-white/5',
                isSelected
                  ? 'scale-105 ring-primary/50 shadow-[0_0_18px_var(--juke-glow)]'
                  : 'group-hover/card:ring-primary/30',
              )}
            >
              {/* Label */}
              <div
                className={cn(
                  'absolute inset-[34%] rounded-full transition-colors duration-300',
                  isSelected
                    ? 'bg-primary shadow-[0_0_10px_var(--juke-glow)]'
                    : 'bg-[var(--juke-label-bg)] opacity-25',
                )}
              />
            </div>
          </AspectRatio>
        </div>
      </CardContent>
    </Card>
  );
};
