import type { TimeSignature } from "./time-signature";

export interface Scene {
  name: string;
  tempo: number;
  timeSignature: TimeSignature;
}
