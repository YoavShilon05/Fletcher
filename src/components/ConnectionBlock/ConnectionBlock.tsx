import { Radio, RefreshCw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ConnectionBlockProps {
  open: boolean;
}

export const ConnectionBlock = ({open}: ConnectionBlockProps) => {
  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        // Force rigid blocking by disabling escape/outside clicks if standard behavior allows it
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="sm:max-w-[420px] p-6 gap-6 border-primary/30 bg-background/95 backdrop-blur-md shadow-2xl"
      >
        <DialogHeader className="flex flex-col items-center justify-center text-center gap-4">
          {/* Animated Glowing Icon Container */}
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[0_0_15px_rgba(239,68,68,0.1)]">
            <Radio className="h-7 w-7 animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          </div>

          <div className="space-y-2">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
              Ableton Connection Lost
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed max-w-[320px] mx-auto">
              Make sure <span className="font-semibold text-foreground">Ableton Live</span> is running and the <span className="font-semibold text-foreground">AbletonOSC</span> control surface is properly enabled.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Status indicator bottom bar */}
        <div className="flex items-center justify-center gap-2.5 rounded-xl bg-muted/50 px-4 py-3 text-xs font-medium text-muted-foreground border border-muted">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
          <span>Waiting for handshake protocol...</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};