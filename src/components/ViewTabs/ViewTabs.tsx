import {Tabs, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {ViewType} from "@/interfaces/view-type.ts";

interface ViewTabsProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const VIEWS: ViewType[] = ['Title', 'Click', 'Chords', 'Chart'];

export const ViewTabs = ({ currentView, onViewChange }: ViewTabsProps) => {
  return (
    <Tabs
      value={currentView}
      onValueChange={(value) => onViewChange(value as ViewType)}
      className="w-full shrink-0"
    >
      <TabsList className="w-full grid grid-cols-4 h-auto gap-1 rounded-md border border-border bg-background/60 p-1">
        {VIEWS.map((view) => (
          <TabsTrigger
            key={view}
            value={view}
            className="rounded-sm border border-transparent py-2 font-mono text-[10px] sm:text-[11px] tracking-widest uppercase text-card-foreground transition-all cursor-pointer data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold data-[state=active]:shadow-[0_0_10px_var(--juke-glow)]"
          >
            {view}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};