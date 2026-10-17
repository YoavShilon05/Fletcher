export const VIEW_TYPES = ["Title", "Click", "Chords", "Chart"] as const;

export type ViewType = (typeof VIEW_TYPES)[number];
