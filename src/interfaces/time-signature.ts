export interface TimeSignature {
  numerator: number;
  denominator: number;
}

export interface TimeSignatureChangeEvent {
  timeSignature: TimeSignature;
  time: number;
}