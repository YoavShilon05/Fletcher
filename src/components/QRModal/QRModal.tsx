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

async function getBandServerAddress(): Promise<string | undefined> {
  try {
    return await invoke<string>("get_band_server_address");
  } catch (e) {
    console.error("Failed to get band server address:", e);
  }
}

interface QRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QRModal = ({ open, onOpenChange }: QRModalProps) => {
  const [code, setCode] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    getBandServerAddress()
      .then(setCode)
      .finally(() => setLoading(false));
  }, [open]);

  const url = code ? `http://${code}` : undefined;

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