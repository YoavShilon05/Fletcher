import {getDefaultStore} from "jotai";
import {timeSignatureChangesAtom} from "@/stores/store.ts";
import {Song} from "@/interfaces/song.ts";
import {getTimeSignature} from "@/utils/get-time-signature.ts";
import {TimeSignature} from "@/interfaces/time-signature.ts";

const store = getDefaultStore();

const calcMeasuresForTimeSignature = (barLengthInBeats: number, timeSignature: TimeSignature) => {
  return (barLengthInBeats * timeSignature.denominator) / (4 * timeSignature.numerator)
}

export const calculateMeasure = (beat: number, song: Song) => {
  const allTimeSignatureChanges = store.get(timeSignatureChangesAtom);
  const timeSignatureChanges = allTimeSignatureChanges.filter(change => change.time > song.timelineLocation && change.time < beat);

  let accMeasure = 0;
  let pointer = song.timelineLocation;

  while (pointer < beat) {
    const nextTimeSignatureChange = timeSignatureChanges.at(0);
    const currentTimeSignature = getTimeSignature(pointer, song)

    // if there are no more changes before the beat:
    if (!nextTimeSignatureChange || nextTimeSignatureChange.time > beat) {
      const length = beat - pointer;
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