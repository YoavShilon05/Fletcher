import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface OscMessage {
    address: string;
    args: string[];
}

export function useOscListener(onMessage: (msg: OscMessage) => void) {
    useEffect(() => {
        const unlisten = listen<OscMessage>("osc-message", (event) => {
            onMessage(event.payload);
        });

        return () => {
            unlisten.then((f) => f());
        };
    }, [onMessage]);
}

export function sendOsc(address: string, args: number[]) {
    return invoke("send_osc", { address, args });
}