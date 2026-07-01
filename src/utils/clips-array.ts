import {SectionNames} from "@/interfaces/song-section.ts";

export const clips = [
  ...Array.from({ length: 8 }, (_, i) => (i + 1).toString()),
  ...Object.values(SectionNames).map(value => value.toLowerCase())
]