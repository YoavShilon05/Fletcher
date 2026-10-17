/**
 * An OSC message as it reaches the webview. The host's Rust bridge formats
 * each argument with `{:?}` (e.g. `Float(72.0)`, `String("Chorus")`), while
 * band-server broadcasts arrive as plain strings (`"72"`). Both are decoded by
 * `decodeOscValue`.
 */
export interface RawOscMessage {
  address: string;
  args: string[];
}

export type OscValue = string | number | boolean | null;

const WRAPPED_VALUE = /^(\w+)\("?(.*?)"?\)$/;

/** Unwrap a Debug-formatted OSC argument into a JS primitive. */
export function decodeOscValue(raw: string | number | boolean): OscValue {
  if (typeof raw !== "string") return raw;

  const match = raw.match(WRAPPED_VALUE);
  if (!match) return raw;

  const [, type, value] = match;
  switch (type) {
    case "Float":
    case "Double":
    case "Int":
    case "Long":
      return Number(value);
    case "Bool":
    case "Boolean":
      return value.toLowerCase() === "true";
    case "Nil":
    case "None":
      return null;
    default:
      return value;
  }
}

// --- Field coercion -----------------------------------------------------------
// Broadcast args are stringified on the way through the band server, so a
// number can arrive as "72". Decoders coerce each field to the type they need.

export function asNumber(value: OscValue | undefined): number {
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) throw new TypeError(`Expected a number, got ${JSON.stringify(value)}`);
  return n;
}

export function asString(value: OscValue | undefined): string {
  if (value === null || value === undefined) throw new TypeError("Expected a string, got nothing");
  return String(value);
}

export function asBoolean(value: OscValue | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (value === "true" || value === "True") return true;
  if (value === "false" || value === "False") return false;
  throw new TypeError(`Expected a boolean, got ${JSON.stringify(value)}`);
}

/** Split a flat argument list into fixed-size records, dropping a trailing partial one. */
export function chunk<T>(values: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i + size <= values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}

// --- Typed message definitions ------------------------------------------------

/** An incoming address together with the decoder for its payload. */
export interface OscMessageType<T> {
  address: string;
  decode(args: OscValue[]): T;
}

export const defineMessage = <T>(
  address: string,
  decode: (args: OscValue[]) => T,
): OscMessageType<T> => ({ address, decode });

/**
 * Decode `raw` if it is a `type` message. Returns `undefined` for other
 * addresses, and for malformed payloads (logged — one bad packet must not take
 * down a listener mid-show).
 */
export function matchMessage<T>(type: OscMessageType<T>, raw: RawOscMessage): T | undefined {
  if (raw.address !== type.address) return undefined;
  try {
    return type.decode(raw.args.map(decodeOscValue));
  } catch (err) {
    console.warn(`Malformed ${type.address} payload`, raw.args, err);
    return undefined;
  }
}
