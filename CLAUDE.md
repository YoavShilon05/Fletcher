# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Fletcher is

A live-performance companion for Ableton Live. It reads a Live set's locators as a setlist, calls out song sections ("chorus… 1, 2, 3, 4") by building spoken-cue clips onto the arrangement, and shows the band a click / chords / sheet-music view that follows the playhead. One machine runs the **host** (Tauri desktop app next to Live); bandmates open the host's LAN URL in a browser as **followers**.

Three codebases live here, each with its own CLAUDE.md for details:

- `src/` — React 19 + TypeScript + Jotai + Tailwind 4 / shadcn frontend (shared by host and followers). UI specifics: `src/components/CLAUDE.md`.
- `src-tauri/` — Rust: OSC bridge to Live, LAN "band server", MuseScore chart rendering. See `src-tauri/CLAUDE.md`.
- `src-osc/` — a vendored, **modified** fork of AbletonOSC (Python remote script running inside Live). See `src-osc/CLAUDE.md`.

## Commands

```sh
npm run tauri dev        # run the host app (Vite on :1420 + Tauri)
npm run dev              # frontend only in a browser — no Tauri APIs, behaves as a follower
npm run build            # tsc + vite build → dist/ (also what the band server serves to followers)
npm test                 # vitest run (all frontend tests)
npx vitest run src/features/setlist/build-setlist.test.ts   # single file
npx vitest run -t "name of test"                            # by test name
npm run typecheck
npm run lint             # eslint; src/components/ui (shadcn), src-tauri, src-osc are ignored
npm run format           # prettier (printWidth 100, double quotes, trailing commas)
cargo test --manifest-path src-tauri/Cargo.toml             # Rust unit tests
```

- `predev`/`prebuild` run `scripts/copy-webmscore.mjs`, which vendors webmscore's WASM into `public/webmscore/` (served same-origin). Run `npm install` first.
- In `tauri dev` the band server serves `../dist`, so followers only see the app after at least one `npm run build`.
- Vitest uses the node environment by default; tests that need a DOM start with `// @vitest-environment happy-dom`. Shared song/context fixtures are in `src/test/fixtures.ts`.
- Commit messages use Conventional Commits with a scope, e.g. `fix(performance): …`, `refactor(setlist): …`.
- `TODO.md` holds the feature backlog.

## Runtime topology

```
Ableton Live + AbletonOSC (src-osc)  ◀──UDP :11000──  commands from the host
        │ replies / listeners ──UDP :11001──▶  Rust host (src-tauri/src/lib.rs)
        │                                         ├─ emits "osc-message" to the host webview
        │                                         └─ band server :11002 (axum)
        │                                              /ws      → every OSC message + host broadcasts, JSON
        │                                              /charts  → baked chart cache (app-data dir)
        │                                              /*       → dist/ (the same frontend)
Followers (browsers on LAN) ◀── WebSocket / HTTP ──────┘
```

- `isHost` (`src/lib/osc/transport.ts`) = running inside Tauri. `subscribeOsc` reads from the Tauri event on the host and from the WebSocket on followers. `sendOsc`/`broadcast` are host-only and no-op with a warning on followers — **followers are strictly read-only**.
- The band server caches the latest message per address and replays it to late joiners, so any state followers need must be expressed as an OSC message (Live's own, or a `/broadcast/*` one from the host).
- Host-only data (things Live doesn't expose over OSC — tempo/time-signature automation parsed from the `.als`, chart-ready announcements, a heartbeat for clock offset) is re-broadcast via `band.*` in `src/lib/osc/live-api.ts`.

## Frontend architecture

**OSC layer (`src/lib/osc/`)** — the single place addresses are spelled out:
- `addresses.ts`: every incoming message as `defineMessage(address, decoder)` (`LIVE.*`, `BROADCAST.*`), plus the listen / initial-query lists sent at startup.
- `live-api.ts`: typed outgoing commands (`live.*` → Ableton, `band.*` → followers).
- `message.ts`: args arrive as Rust `{:?}` strings on the host (`Float(72.0)`, `String("Chorus")`) but as plain strings via the band server (`"72"`); `decodeOscValue` + `asNumber/asString/asBoolean` handle both. Decoders throw on bad payloads; `matchMessage` catches and logs so one bad packet can't kill a listener mid-show.
- `useOscMessage(LIVE.x, handler)` is how hooks subscribe.
- OSC is fire-and-forget UDP: when ordering matters (creating scenes before clips, create-then-name), `await` each `live.*` call sequentially (see `features/performance/clips.ts`).

**Controllers (`src/app/Controllers.tsx`)** — headless components that mount all background hooks, so high-frequency state (the beat) re-renders only them. `SharedControllers` run everywhere; `HostControllers` (everything that writes to Live or broadcasts) only on the host. `useLiveListeners` is mounted last so every subscriber exists before Live starts replying. New background behaviour goes here, in the right group.

**State** — Jotai atoms per feature in `src/features/*/atoms.ts`. `features/live/atoms.ts` mirrors Live's state and is written only by the sync hooks in that folder; everything else reads or derives. Hooks reacting per-beat use `useStore()` + `store.get/set` to avoid re-renders.

**Features (`src/features/`)**:
- `live/` — mirroring Live (`useLiveStateSync`), `.als` parsing (`als.ts`: gunzip + XML; tempo/time-sig envelopes matched by automation-target id; handles `MainTrack` vs pre-Live-12 `MasterTrack`), and `useBeatClock`, which extrapolates the playhead from the wall-clock `playback_start` anchor + tempo envelope instead of trusting jittery UDP beat messages (running `PLAYBACK_LOOKAHEAD_MS` ahead).
- `setlist/` — `buildSetlist` turns locators into songs; selection, follow-playback, snap selection.
- `performance/` — Fletcher tracks, spoken cues, tempo sync, loop snapping, auto-stop at STOP, control clips.
- `music/` — pure beat / measure / tempo / time-signature math.
- `chart/` + `lib/musescore`, `lib/webmscore` — sheet-music pipeline (below).
- `view/` — current view tab, fullscreen, toolbar layout.

Pure logic lives in plain `.ts` modules with colocated `*.test.ts`, separate from the hooks that wire it up; follow that split. Tunable numbers (timing, zoom, gestures) go in `src/constants.ts`.

## Live set conventions (the "data model")

Fletcher has no database — the Live set *is* the data. Defined in `src/types/song.ts` and `src/constants.ts`:

- **Locators**, in timeline order: any name that isn't a reserved word starts a new song. `SectionNames` (`INTRO`, `VERSE`, `CHORUS`, …) mark sections; `ExtraCueNames` (`BREAK`, `UNISON`, …) mark spoken cues inside a section; `START` marks bar 1 of the chart (before it is count-in); `STOP` marks the song's end. Locators before the first song are ignored.
- **Scenes** named like a song supply its tempo (else the set tempo).
- **Tracks** `Fletcher_Count` (audio; session slots hold the count numbers 1–8, then one spoken name per section/cue, loaded by name from `Fletcher_<name>.wav` in Live's browser) and `Fletcher_Control` (MIDI; trigger clips `next_song`, `prev_song`, `next_section`, `prev_section`). The slot layout is baked into existing sets — don't reorder `countClips` / `controlClips` or change `COUNT_CLIP_NUMBERS`.
- **Charts**: `<dir of the .als>/charts/<song name>.mscz`.
- Songs are rebuilt whenever locators/scenes change — identify them by `name`, never by reference.

## Spoken cues are compiled, not fired live

`compileCues` (`features/performance/compile-cues.ts`) walks each beat through `cueClipAt` (`cue-calls.ts`: call the name `CALL_SECTION_PAD` beats ahead, then count `1..CALL_CUE_COUNT` on the beats right before the cue) and sends the result in one `/live/track/build_arrangement_clips` message — a custom AbletonOSC handler that clears `cueRange` and duplicates session clips onto the arrangement **unwarped**, so tempo automation can't stretch them and OSC latency can't shift them. `cueRange` stops at STOP or at the next song's earliest cue, so rebuilding one song never wipes its neighbour's intro call. Timing nudges (`SECTION_CUE_OFFSET`, `COUNT_CUE_OFFSET`) are in beats.

## Chart pipeline

Host (`features/chart/useBakedChart.ts`): find the `.mscz` → content-hash key → reuse the disk bake or bake now → write to the app-data `chart-cache/` → `band.chartReady(song, key)`. Followers look the song up in `/charts/index.json` and fetch the same files over HTTP. Resolutions are memoized module-wide so Chart and Chords views share one bake.

- Renderer preference: the installed **MuseScore 4+** via Rust (`musescore_bake`, normalized in `src/lib/musescore/bake.ts`), falling back to bundled **webmscore** (MuseScore 3.6 WASM, `src/lib/webmscore/`). Both produce the same `BakeResult`.
- Cache key = `<sanitized name>-<sha256[0..8]>-v<BAKE_VERSION>-<ms|wm>` (`features/chart/cache.ts`). **Bump `BAKE_VERSION` whenever bake output shape or logic changes**, or stale caches will be served.
- `manifest.json` is written last; its presence means the bake is complete.
- `measure-map.ts` maps played measures (repeats unrolled) to chart measure boxes; `extract-chords.ts` pulls chord symbols from the MusicXML for the Chords view.

## Path alias

`@/` → `src/` (configured in `vite.config.ts` and `tsconfig.json`).
