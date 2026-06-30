import {TimeSignature} from "@/interfaces/time-signature.ts";

export interface Scene {
  name: string;
  tempo: number;
  timeSignature: TimeSignature;
}