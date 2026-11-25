# src-tauri — Rust host

See the root `CLAUDE.md` for the overall topology. This crate is small; three modules:

- `lib.rs` — `send_osc` (JSON args → OSC to `127.0.0.1:11000`; ints become `Int`, other numbers `Float`, bools `Bool`), and a background UDP listener on `:11001` that, for every message from AbletonOSC, both emits `"osc-message"` to the webview and forwards it to followers. Args are stringified with `{:?}` (`Float(72.0)`), which the frontend's `decodeOscValue` relies on — don't change that format without updating `src/lib/osc/message.ts`.
- `band_server.rs` — axum on `0.0.0.0:11002`: `/ws` (cached last-value-per-address snapshot, then live stream), `/charts` (app-data `chart-cache/`), fallback to the frontend `dist/` (`../dist` in debug builds, the resource dir in release). Broadcast args are plain strings.
- `musescore.rs` — locates MuseScore 4+ (`FLETCHER_MUSESCORE` env var overrides; then platform install dirs; then PATH with a `--version` check) and bakes a `.mscz` in two converter passes (`--score-parts`, then one `-j` batch job for SVG + `.mpos` + MusicXML). Bakes are serialized by `BAKE_LOCK`, run in a temp `WorkDir`, and time out after 10 minutes. It also patches `<showRests>0` → `1` in a scratch copy to dodge a MuseScore 4.7 bug that blanks linked notation staves. `-r 100` makes `.mpos` coordinates equal SVG viewBox units.

New Tauri commands must be added to `generate_handler!` in `lib.rs`; frontend permissions live in `capabilities/default.json`.

## Tests

```sh
cargo test                                              # from src-tauri/
FLETCHER_TEST_MSCZ=path/to/chart.mscz cargo test -- --ignored   # end-to-end bake against a real MuseScore install
```
