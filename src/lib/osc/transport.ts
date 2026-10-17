import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { RawOscMessage } from "./message";

/**
 * The host is the Tauri app talking to Ableton; followers are browsers on the
 * LAN served by the host's band server. Followers only ever receive — every
 * outgoing call is host-only.
 */
export const isHost = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

type Subscriber = (msg: RawOscMessage) => void;

const subscribers = new Set<Subscriber>();
const emit = (msg: RawOscMessage) => subscribers.forEach((fn) => fn(msg));

// --- Host: one Tauri event listener shared by every subscriber ---------------

let unlistenTauri: Promise<() => void> | null = null;

function openTauri() {
  unlistenTauri ??= listen<RawOscMessage>("osc-message", (event) => emit(event.payload));
}

function closeTauri() {
  unlistenTauri?.then((unlisten) => unlisten());
  unlistenTauri = null;
}

// --- Follower: one WebSocket to the band server, reconnecting with backoff ---

const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 10_000;

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;

function openSocket() {
  if (ws) return; // already connecting or open

  const socket = new WebSocket(`ws://${window.location.host}/ws`);
  ws = socket;

  socket.onopen = () => {
    reconnectAttempts = 0;
  };

  socket.onmessage = (event) => {
    try {
      emit(JSON.parse(event.data) as RawOscMessage);
    } catch (err) {
      console.warn("Dropped malformed band-server message", err);
    }
  };

  socket.onclose = () => {
    if (ws !== socket) return; // closed deliberately by closeSocket()
    ws = null;
    if (subscribers.size === 0) return;

    const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempts++, RECONNECT_MAX_MS);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (subscribers.size > 0) openSocket();
    }, delay);
  };
}

function closeSocket() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  const socket = ws;
  ws = null;
  socket?.close();
}

/** Receive every incoming OSC message. Returns an unsubscribe function. */
export function subscribeOsc(fn: Subscriber): () => void {
  subscribers.add(fn);
  if (isHost) openTauri();
  else openSocket();

  return () => {
    subscribers.delete(fn);
    if (subscribers.size > 0) return;
    if (isHost) closeTauri();
    else closeSocket();
  };
}

export type OscArg = string | number | boolean | null | undefined;

function hostOnly(command: string, address: string, args: OscArg[]): Promise<void> {
  if (!isHost) {
    // Reaching this means host-only code was mounted on a follower.
    console.warn(`${command}("${address}") ignored — followers are read-only`);
    return Promise.resolve();
  }
  return invoke(command, { address, args });
}

/** Send an OSC message to Ableton (AbletonOSC on 127.0.0.1:11000). */
export const sendOsc = (address: string, args: OscArg[] = []) =>
  hostOnly("send_osc", address, args);

/** Push a message to every connected follower over the band server. */
export const broadcast = (address: string, args: OscArg[] = []) =>
  hostOnly("broadcast_message", address, args);
