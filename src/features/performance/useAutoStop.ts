import { useStore } from "jotai";
import { AUTO_STOP_MARGIN } from "@/constants";
import { isPlayingAtom } from "@/features/live/atoms";
import { chartStart } from "@/features/music/measure";
import { cueStartAtom } from "@/features/setlist/actions";
import { nextSongAtom, selectedSongAtom } from "@/features/setlist/atoms";
import { LIVE } from "@/lib/osc/addresses";
import { live } from "@/lib/osc/live-api";
import { useOscMessage } from "@/lib/osc/useOscMessage";

/**
 * Host: when playback crosses the selected song's STOP locator, stop Live and
 * cue up the next song.
 */
export function useAutoStop() {
  const store = useStore();

  // Live's own beat messages, not the extrapolated clock — stopping must
  // follow where Live actually is.
  useOscMessage(LIVE.beat, (beat) => {
    if (!store.get(isPlayingAtom)) return;

    const song = store.get(selectedSongAtom);
    if (song?.end === undefined) return;

    const distance = beat - song.end;
    if (distance < 0 || distance > AUTO_STOP_MARGIN) return;

    const nextSong = store.get(nextSongAtom);
    if (nextSong) {
      // Park on the next song's START, so playback resumes at its bar 1
      // rather than replaying its count-in.
      store.set(cueStartAtom, chartStart(nextSong));
      store.set(selectedSongAtom, nextSong);
    }
    live.stopPlaying();
  });
}
