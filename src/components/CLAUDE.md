# src/components — UI

See the root `CLAUDE.md` for the data flow. Components here are mostly thin: they read atoms and call actions/hooks from `src/features/*`. Logic that isn't about rendering belongs in a feature module, not here.

## Layout (`src/App.tsx`)

A full-screen grid: `SongStructure` (sections, left, `lg`+), the active view (centre), `SongSelector` (setlist, right, `xl`+). Side panels drop away as the width shrinks — followers are often phones, so every view must work at phone width. `fullscreenAtom` hides the header, tabs and side panels.

- `Toolbar` floats absolutely over the top of the view and wraps onto several rows on narrow screens. It publishes its measured height to `toolbarHeightAtom`, and `ViewContainer` pads by that much so the toolbar never covers a view's own controls. Keep that contract if you change either.
- Toolbar controls are `pointer-events-auto` inside a `pointer-events-none` full-width bar, so the empty bar doesn't swallow clicks on the view below.
- Chart-only tools (zoom, follow) are shown only when `currentViewAtom` is `Chart` or `Chords`.
- Controls that write to Live do nothing on followers (`sendOsc` is a no-op there). `SongSelector` hides its build button with `isHost` and `QRModal` branches on it, but the Toolbar's build/track buttons are currently not gated. Gate new host-only controls on `isHost`.

## Views (`Views/`)

`VIEWS` in `App.tsx` maps `ViewType` (`src/types/view-type.ts`) to a component; to add a view, extend `VIEW_TYPES` and the map. Views take no props — they read the selected song and playhead from atoms.

- `ViewContainer` — frame for every view; flashes the background on each beat (`lightScreenAtom`) by re-keying an element on `currentBeatAtom`.
- `TitleView`, `ClickView` — song title / beat circles. `ClickView` draws pulses from `features/music/pulse.ts` (subdivided for non-x/4 signatures) and uses `usePlayheadSteps` for sub-beat timing, not `currentBeatAtom`.
- `ChartView` / `ChordView` — both go through `useScoreView(song)`, which resolves the baked chart, active measure, zoom and follow, and collapses loading/missing/error into a placeholder. Both render inside `ScoreSurface`, which pins a scroll container so a tall score scrolls *inside* the view rather than growing the page. `useFollowScroll` (`features/chart`) keeps the playing measure about a third of the way down the viewport.
- `SheetViewer` inlines pre-rendered SVG pages with `dangerouslySetInnerHTML` and overlays the measure highlight from `positions` (SVG viewBox units × scale, pages stacked with `PAGE_GAP`). It rewrites each page's SVG ids with a page-unique prefix, because MuseScore numbers ids from 1 on every page and the collisions break TAB staff-line clip paths. Keep that rewrite when touching page rendering.

## Styling

- Tailwind 4 (configured in `src/index.css`, no tailwind config file) plus shadcn tokens. The `:root` palette is a custom dark "jukebox" theme (orange `--primary`, small `--radius`) with extra `--juke-*` and `--chart-highlight-*` variables; use the tokens (`bg-background`, `text-muted-foreground`, `border-border`, …) instead of raw colours. Scores always render on white.
- `cn()` from `@/lib/utils` merges class names. Icons are `lucide-react`.
- `ui/` is generated shadcn code (style `radix-rhea`, see `components.json`): add components with the `shadcn` CLI, don't hand-edit them, and don't expect them to be linted.
- Each component lives in its own folder (`Foo/Foo.tsx`) with named exports; tests sit beside it (`Foo.test.tsx`, with `// @vitest-environment happy-dom`).
