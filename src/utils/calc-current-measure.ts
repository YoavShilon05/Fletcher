import {getDefaultStore} from "jotai";
import {timeSignatureChangesAtom} from "@/stores/store.ts";
import {Song} from "@/interfaces/song.ts";
import {getTimeSignature} from "@/utils/get-time-signature.ts";
import {getChartStart} from "@/utils/get-chart-start.ts";
import {TimeSignature} from "@/interfaces/time-signature.ts";

const store = getDefaultStore();

const calcMeasuresForTimeSignature = (barLengthInBeats: number, timeSignature: TimeSignature) => {
  return (barLengthInBeats * timeSignature.denominator) / (4 * timeSignature.numerator)
}

const measuresBetween = (from: number, to: number, song: Song) => {
  const allTimeSignatureChanges = store.get(timeSignatureChangesAtom);
  const timeSignatureChanges = allTimeSignatureChanges.filter(change => change.time > from && change.time < to);

  let accMeasure = 0;
  let pointer = from;

  while (pointer < to) {
    const nextTimeSignatureChange = timeSignatureChanges.at(0);
    const currentTimeSignature = getTimeSignature(pointer, song)

    // if there are no more changes before the beat:
    if (!nextTimeSignatureChange || nextTimeSignatureChange.time > to) {
      const length = to - pointer;
      return accMeasure + calcMeasuresForTimeSignature(length, currentTimeSignature)
    }

    // else - there is a time sig change :(
    const length = nextTimeSignatureChange.time - pointer;
    accMeasure += calcMeasuresForTimeSignature(length, currentTimeSignature);
    pointer = nextTimeSignatureChange.time;
    timeSignatureChanges.shift()
  }

  return accMeasure;
}

/**
 * Measure of `beat`, counted from the chart's start rather than the song
 * locator. Beats inside the count-in (before the first structure locator) come
 * back negative, so callers can tell "not started yet" from measure 0.
 */
export const calculateMeasure = (beat: number, song: Song) => {
  const chartStart = getChartStart(song);

  // Both legs are measured from the song locator so a time signature change
  // sitting inside the count-in is still accounted for.
  return measuresBetween(song.timelineLocation, beat, song)
    - measuresBetween(song.timelineLocation, chartStart, song);
}
