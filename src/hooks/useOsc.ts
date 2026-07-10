import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { OscMessage } from "osc";

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

// --- Singleton WebSocket + subscriber registry (browser/follower path only) ---
let ws: WebSocket | null = null;
const subscribers = new Set<(msg: OscMessage) => void>();

function ensureSocket() {
    if (ws) return; // already connecting or open — don't open a second one

    console.log("CREATING WEBSOCKET")

    ws = new WebSocket(`ws://${window.location.host}/ws`);

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data) as OscMessage;
        subscribers.forEach((fn) => fn(msg));
    };

    ws.onclose = () => {
        console.log("CLOSED WEBSOCKET")
        ws = null; // allow a future subscriber to reopen it
        // TODO: reconnect-with-backoff goes here eventually
    };
}

export function useOscListener(onMessage: (msg: OscMessage) => void) {
    const onMessageRef = useRef(onMessage);
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    useEffect(() => {
        if (isTauri) {
            const unlisten = listen<OscMessage>("osc-message", (event) => {
                onMessageRef.current(event.payload);
            });
            return () => { unlisten.then((f) => f()); };
        } else {
            const handler = (msg: OscMessage) => onMessageRef.current(msg);
            subscribers.add(handler);
            ensureSocket();

            return () => {
                subscribers.delete(handler);
                // last subscriber gone → close the shared socket
                if (subscribers.size === 0 && ws) {
                    ws.close();
                    ws = null;
                }
            };
        }
    }, []); // stable — identity of onMessage no longer matters
}

export function sendOsc(address: string, args: unknown[]) {
    if (!isTauri) {
        console.warn(`sendOsc("${address}") ignored — follower is read-only`);
        return Promise.resolve();
    }
    return invoke("send_osc", { address, args });
}

export function broadcast(address: string, args: unknown[]) {
    if (!isTauri) {
        console.warn(`sendOsc("${address}") ignored — follower is read-only`);
        return Promise.resolve();
    }
    return invoke("broadcast_message", { address, args });
}