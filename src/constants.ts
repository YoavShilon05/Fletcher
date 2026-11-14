// --- Live set conventions -----------------------------------------------------

export const CHARTS_FOLDER_NAME = "charts";
// Charts are authored as native MuseScore files and baked to SVG on first open.
export const CHART_SOURCE_EXTENSION = "mscz";

export const CLIP_PREFIX = "Fletcher_";
export const CLIP_FILE_TYPE = "wav";

export const FLETCHER_COUNT_TRACK_NAME = "Fletcher_Count";
export const FLETCHER_CONTROL_TRACK_NAME = "Fletcher_Control";
// Long enough that Live's is_triggered listener reliably observes the fire
// before the clip finishes, even with launch quantization set to None.
export const CONTROL_CLIP_LENGTH_BEATS = 4;

// --- Performance timing (in beats unless noted) -------------------------------

/** How many beats before a section its name is called. */
export const CALL_SECTION_PAD = 7;
/** How many beats are counted in ("1, 2, 3, 4") right before a section. */
export const CALL_CUE_COUNT = 4;

/**
 * Fine-tuning nudges for compiled cue clips, in beats. Negative pulls a clip
 * earlier — usually what you want, since a spoken word's attack sits a moment
 * after the start of its sample, so nudging the clip back puts the consonant
 * on the beat instead of behind it.
 *
 * Beats rather than seconds: the nudge is then one number that doesn't depend
 * on whatever tempo happens to be in force where the clip lands.
 */
export const SECTION_CUE_OFFSET = -0.1;
export const COUNT_CUE_OFFSET = -0.07;
/**
 * Whether compiled cue clips follow the set's tempo. Off: an unwarped clip
 * plays at its recorded speed, which is the whole reason the cues are built
 * onto the timeline instead of fired live — tempo automation can't stretch a
 * spoken word it isn't allowed to touch.
 */
export const CUE_CLIP_WARPING = false;
/** Past the end of any conceivable arrangement, for "clear the whole track". */
export const ARRANGEMENT_END = 1_000_000;

/** How far past a STOP locator playback may get before auto-stop gives up. */
export const AUTO_STOP_MARGIN = 2;
/** Pause between stopping Live and moving the playhead for a control clip, in ms. */
export const CLIP_CONTROL_SETTLE_MS = 100;

/**
 * The local beat clock runs this many ms ahead of Live's playback-start stamp,
 * so cues and the UI land on the beat instead of just after it.
 */
export const PLAYBACK_LOOKAHEAD_MS = 200;

// --- Band (host -> followers) -------------------------------------------------

export const BROADCAST_HEARTBEAT_INTERVAL_MS = 5000;

// --- UI -----------------------------------------------------------------------

export const CHART_ZOOM_MIN = 0.5;
export const CHART_ZOOM_MAX = 3;
/** Each zoom click scales by this factor — geometric steps feel even across the range. */
export const CHART_ZOOM_STEP = 1.2;

/** Wait this long after the last wheel/swipe step before cueing Live to the song, in ms. */
export const SONG_SELECT_DEBOUNCE_MS = 250;
/** Minimum time between two wheel steps, in ms. */
export const SONG_SCROLL_THROTTLE_MS = 80;
/** Vertical swipe distance that moves one song, in px. */
export const SONG_SWIPE_THRESHOLD_PX = 30;
