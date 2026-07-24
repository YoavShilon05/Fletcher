export const CHARTS_FOLDER_NAME = 'charts';

export const CLIP_PREFIX = "Fletcher_"
export const CLIP_FILE_TYPE = "wav"

export const CALL_SECTION_PAD = 7
export const CALL_CUE_COUNT = 4

export const FLETCHER_COUNT_TRACK_NAME = "Fletcher_Count"
export const FLETCHER_CONTROL_TRACK_NAME = "Fletcher_Control"
// Long enough that Live's is_triggered listener reliably observes the fire
// before the clip finishes, even with launch quantization set to None.
export const CONTROL_CLIP_LENGTH_BEATS = 4

export const AUTO_STOP_MARGIN = 2

export const PING_INTERVAL = 2000;
export const DEATH_TIMEOUT = 1000;

export const BROADCAST_HEARTBEAT_TIMEOUT = 5000;
export const BROADCAST_HEARTBEAT_ADDRESS = "/broadcast/heartbeat"
