import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";
import { isTauri } from "@/hooks/useOsc.ts";

/** The URL other devices should open to join this session. */
async function getJoinUrl(): Promise<string | undefined> {
  // Followers are *already* being served by the band server, so the page's own
  // origin is exactly the address to share — and `invoke` doesn't exist here,
  // which is why the modal used to come up empty on a phone.
  if (!isTauri) return window.location.origin;

  try {
    // Host: the local IP the server is reachable at, which the window's own
    // (tauri://) origin can't tell us.
    return `http://${await invoke<string>("get_band_server_address")}`;
  } catch (e) {
    console.error("Failed to get band server address:", e);
  }
}

interface QRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QRModal = ({ open, onOpenChange }: QRModalProps) => {
  const [url, setUrl] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    getJoinUrl()
      .then(setUrl)
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Join Session</DialogTitle>
          <DialogDescription>
            Scan this code from another device on the same network to join the band session.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center gap-4 py-4 min-h-[220px]">
          {loading && (
            <p className="text-sm text-muted-foreground">Getting address...</p>
          )}

          {!loading && url && (
            <>
              <div className="bg-white p-4 rounded-md">
                <QRCode value={url} size={180} />
              </div>
              <p className="text-sm text-muted-foreground font-mono">{url}</p>
            </>
          )}

          {!loading && !url && (
            <div className="flex flex-col items-center gap-2 text-destructive text-center">
              <AlertCircle className="h-8 w-8" />
              <p className="text-sm font-medium">
                Couldn't determine the local network address.
              </p>
              <p className="text-xs text-muted-foreground">
                Make sure you're connected to a network and try again.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};