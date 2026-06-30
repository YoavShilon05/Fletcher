export interface TimeSignatureEvent {
  time: number;
  value: number
}

function decodeTimeSignatureTime(tsTime: number) {
  return tsTime / 4 + 1;
}

function decodeTimeSignatureValue(tsId: number) {
  const denominators = [1, 2, 4, 8, 16];

  // Determine which denominator block the ID falls into
  const blockIndex = Math.floor(tsId / 99);
  const denominator = denominators[blockIndex] || 4; // Fallback to 4 if out of range

  // The remainder tells us the numerator value (shifted by 1)
  const numerator = (tsId % 99) + 1;

  return { numerator, denominator };
}

export function parseTimeSignatureEvents (events: TimeSignatureEvent[]): {
  timeSignature: {numerator: number, denominator: number}, time: number
}[] {
  return events.map(event => {
    return {timeSignature: decodeTimeSignatureValue(event.value), time: decodeTimeSignatureTime(event.time)}
  })
}