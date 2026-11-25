# src-osc — Fletcher's AbletonOSC fork

A vendored copy of [AbletonOSC](https://github.com/ideoforms/AbletonOSC) (a Live MIDI remote script) with Fletcher-specific additions. It runs **inside Ableton Live's embedded Python**, not in this repo's toolchain: it's installed as a Live remote script (see `README.md` → Installation), listens on UDP 11000 and replies on 11001. It bundles its own `pythonosc`, which doesn't decode OSC bools — send flags as 0/1.

Fletcher-specific handlers the frontend depends on (keep them in sync with `src/lib/osc/addresses.ts` / `live-api.ts`):

- `/live/song/start_listen/playback_start` → `/live/song/get/playback_start` (seconds, millis, start beat, tempo): the wall-clock anchor that drives the frontend beat clock.
- `/live/song/get/scenes` returning `name, tempo, numerator, denominator` per scene.
- `/live/track/build_arrangement_clips` (track, start, end, warping, then `slot, beat` pairs) and `/live/track/delete_arrangement_clips`: clear a range and duplicate session clips onto the arrangement in a single Live tick.
- `/live/clip_slot/load_sample`: loads a file by name from Live's browser (user folders + User Library).
- `/live/song/re_enable_automation`, `/live/song/get/file_path`, and clip-slot `is_triggered` listeners.

`README.md` is upstream's API reference. `/live/api/reload` hot-reloads the script in Live during development; `run-console.py` is an interactive OSC console. `tests/` are upstream's pytest suite and need a running Live with the script loaded.

`src-osc` is excluded from eslint/prettier.
