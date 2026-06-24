import React from 'react';
import {Button} from '@/components/ui/button';
import {ViewType} from "@/interfaces/view-type.ts";

interface ViewSelectorProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export const ViewSelector: React.FC<ViewSelectorProps> = ({ currentView, onViewChange }) => {
  const views: ViewType[] = ['Title', 'Click', 'Chords', 'Chart'];

  return (
    <nav className="flex flex-col gap-3 font-mono p-2 select-none items-end">
      {views.map((view) => {
        const isSelected = currentView === view;

        return (
          <Button
            key={view}
            variant={isSelected ? "outline" : "ghost"}
            onClick={() => onViewChange(view)}
            className={`
              w-24 justify-end text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer
              ${isSelected
              ? 'border-primary text-primary bg-[#14141f]/50 shadow-[0_0_12px_var(--juke-glow)] font-bold scale-105'
              : 'text-card-foreground hover:text-foreground hover:bg-transparent'
            }
            `}
          >
            {view}
          </Button>
        );
      })}
    </nav>
  );
};