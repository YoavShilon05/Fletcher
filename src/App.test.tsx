// @vitest-environment happy-dom
// End-to-end smoke test: the whole app in follower mode, fed fake Live state
// over a fake band-server socket.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

// Fake band-server socket: capture it so the test can push messages.
const sockets: FakeSocket[] = [];
class FakeSocket {
  onopen?: () => void;
  onmessage?: (e: { data: string }) => void;
  onclose?: () => void;
  constructor(public url: string) {
    sockets.push(this);
  }
  close() {}
  push(address: string, args: string[]) {
    this.onmessage?.({ data: JSON.stringify({ address, args }) });
  }
}
vi.stubGlobal("WebSocket", FakeSocket);
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    disconnect() {}
  },
);
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("App", () => {
  it("renders and reacts to forwarded Live state", async () => {
    const errors = vi.spyOn(console, "error");
    const { default: App } = await import("./App");
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => root.render(<App />));

    expect(sockets).toHaveLength(1);
    const ws = sockets[0];

    await act(async () => {
      ws.push("/live/song/get/tempo", ["Float(120.0)"]);
      ws.push("/live/song/get/cue_points", [
        'String("Opener")',
        "Float(0.0)",
        'String("START")',
        "Float(2.0)",
        'String("INTRO")',
        "Float(4.0)",
        'String("VERSE")',
        "Float(20.0)",
        'String("STOP")',
        "Float(50.0)",
        'String("Closer")',
        "Float(100.0)",
      ]);
    });
    expect(el.querySelector("h1")?.textContent).toBe("Opener");
    expect(el.textContent).toContain("Closer");
    expect(el.textContent).toContain("120 BPM");
    // Both start points get their own timeline rows (neither sits on a section):
    // the song marker (playback start) and START (chart start).
    expect(el.querySelector("aside")?.textContent).toContain("Playback");
    expect(el.querySelector("aside")?.textContent).toContain("Chart");

    // Playhead moves into the second song -> selection follows.
    await act(async () => ws.push("/live/song/get/beat", ["Int(101)"]));
    expect(el.querySelector("h1")?.textContent).toBe("Closer");
    expect(el.textContent).toContain("Final Song");
    // Closer has no START: only the playback start point.
    expect(el.querySelector("aside")?.textContent).toContain("Playback");
    expect(el.querySelector("aside")?.textContent).not.toContain("Chart");

    // Back to the verse of the first song -> section follows.
    await act(async () => ws.push("/live/song/get/beat", ["Int(25)"]));
    expect(el.querySelector("h1")?.textContent).toBe("Opener");
    const active = [...el.querySelectorAll("aside button span")].find((s) =>
      s.className.includes("font-bold"),
    );
    expect(active?.textContent).toBe("VERSE");

    // Fullscreen hides SongStructure/header — selection must keep following.
    const fullscreen = el.querySelector<HTMLButtonElement>('button[title="Fullscreen"]')!;
    await act(async () => fullscreen.click());
    expect(el.querySelector("aside")).toBeNull();
    await act(async () => ws.push("/live/song/get/beat", ["Int(102)"]));
    expect(el.textContent).toContain("Closer"); // TitleView
    expect(el.textContent).not.toContain("Opener");
    await act(async () => fullscreen.click());
    expect(el.querySelector("h1")?.textContent).toBe("Closer");

    // Malformed payloads are dropped, not thrown.
    await act(async () => ws.push("/live/song/get/beat", []));

    expect(errors).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });
});
