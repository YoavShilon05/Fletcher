import { createStore } from "jotai";
import { describe, expect, it } from "vitest";
import { currentBeatAtom, locatorsAtom } from "@/features/live/atoms";
import {
  clearSectionOverrideAtom,
  currentSectionAtom,
  nextSongAtom,
  selectedSongAtom,
  setlistAtom,
} from "./atoms";

const LOCATORS = [
  { name: "Song A", location: 0 },
  { name: "INTRO", location: 4 },
  { name: "VERSE", location: 20 },
  { name: "STOP", location: 50 },
  { name: "Song B", location: 100 },
  { name: "INTRO", location: 104 },
];

const setup = () => {
  const store = createStore();
  store.set(locatorsAtom, LOCATORS);
  return store;
};

describe("song selection", () => {
  it("defaults to the first song and knows the next one", () => {
    const store = setup();
    expect(store.get(selectedSongAtom)?.name).toBe("Song A");
    expect(store.get(nextSongAtom)?.name).toBe("Song B");
  });

  it("survives the setlist being rebuilt", () => {
    const store = setup();
    store.set(selectedSongAtom, store.get(setlistAtom)[1]);
    store.set(locatorsAtom, [...LOCATORS, { name: "Song C", location: 200 }]);

    expect(store.get(selectedSongAtom)?.name).toBe("Song B");
    expect(store.get(nextSongAtom)?.name).toBe("Song C");
  });

  it("falls back to the first song when the selected one disappears", () => {
    const store = setup();
    store.set(selectedSongAtom, store.get(setlistAtom)[1]);
    store.set(locatorsAtom, LOCATORS.slice(0, 4));
    expect(store.get(selectedSongAtom)?.name).toBe("Song A");
    expect(store.get(nextSongAtom)).toBeUndefined();
  });
});

describe("current section", () => {
  it("follows the playhead by default", () => {
    const store = setup();
    store.set(currentBeatAtom, 25);
    expect(store.get(currentSectionAtom)?.name).toBe("VERSE");
    store.set(currentBeatAtom, 2); // count-in
    expect(store.get(currentSectionAtom)).toBeUndefined();
  });

  it("holds an explicit pick until it is cleared", () => {
    const store = setup();
    const [song] = store.get(setlistAtom);
    store.set(currentSectionAtom, song.structure[1]);
    store.set(currentBeatAtom, 5);
    expect(store.get(currentSectionAtom)?.name).toBe("VERSE");

    store.set(clearSectionOverrideAtom);
    expect(store.get(currentSectionAtom)?.name).toBe("INTRO");
  });

  it("ignores a pick made in another song", () => {
    const store = setup();
    const [songA, songB] = store.get(setlistAtom);
    store.set(currentSectionAtom, songA.structure[1]);
    store.set(selectedSongAtom, songB);
    store.set(currentBeatAtom, 105);
    expect(store.get(currentSectionAtom)).toEqual({ name: "INTRO", timelineLocation: 104 });
  });
});
