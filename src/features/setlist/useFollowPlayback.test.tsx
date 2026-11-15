// @vitest-environment happy-dom
import { createStore, Provider } from "jotai";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { currentBeatAtom, isPlayingAtom, locatorsAtom } from "@/features/live/atoms";
import { snapSelectionAtom } from "@/features/performance/atoms";
import { currentSectionAtom, selectedSongAtom, setlistAtom } from "./atoms";
import { useFollowPlayback } from "./useFollowPlayback";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LOCATORS = [
  { name: "Song A", location: 0 },
  { name: "INTRO", location: 4 },
  { name: "VERSE", location: 20 },
  { name: "STOP", location: 50 },
  { name: "Song B", location: 100 },
  { name: "INTRO", location: 104 },
];

const Harness = () => {
  useFollowPlayback();
  return null;
};

async function mount() {
  const store = createStore();
  store.set(locatorsAtom, LOCATORS);
  const root = createRoot(document.createElement("div"));
  await act(async () =>
    root.render(
      <Provider store={store}>
        <Harness />
      </Provider>,
    ),
  );
  return store;
}

describe("useFollowPlayback", () => {
  it("keeps the song and section under the playhead", async () => {
    const store = await mount();
    await act(async () => store.set(currentBeatAtom, 105));
    expect(store.get(selectedSongAtom)?.name).toBe("Song B");
    expect(store.get(currentSectionAtom)?.name).toBe("INTRO");
  });

  it("leaves an explicit pick alone while stopped in snap mode", async () => {
    const store = await mount();
    await act(async () => store.set(snapSelectionAtom, true));

    const [songA] = store.get(setlistAtom);
    await act(async () => {
      store.set(currentSectionAtom, songA.structure[0]); // INTRO
      store.set(currentBeatAtom, 25); // the playhead says VERSE
    });
    expect(store.get(currentSectionAtom)?.name).toBe("INTRO");
  });

  it("follows the playhead mid-playback in snap mode too", async () => {
    const store = await mount();
    await act(async () => store.set(snapSelectionAtom, true));

    const [songA] = store.get(setlistAtom);
    await act(async () => store.set(currentSectionAtom, songA.structure[0])); // cued INTRO

    // Playing from the cue: the pick is dropped, so the highlight can move on.
    await act(async () => store.set(isPlayingAtom, true));
    await act(async () => store.set(currentBeatAtom, 25));
    expect(store.get(currentSectionAtom)?.name).toBe("VERSE");
    await act(async () => store.set(currentBeatAtom, 5));
    expect(store.get(currentSectionAtom)?.name).toBe("INTRO");
  });
});
