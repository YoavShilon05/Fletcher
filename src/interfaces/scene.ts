export interface Scene {
  name: string;
  tempo: number;
  timeSignature: {
    numerator: number;
    denominator: number;
  }
}