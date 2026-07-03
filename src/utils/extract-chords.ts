// Suggested location: src/utils/extract-chords.ts
//
// Pulls chord symbols straight from a MusicXML file's <harmony> elements —
// i.e. whatever chord notation was typed into the score (Cmaj7, G7/B, N.C. ...),
// not something inferred from the actual notes being played.
//
// Assumes score-partwise MusicXML (the format produced by virtually every
// notation app — Sibelius, Finale, MuseScore, Dorico). Uses the browser's
// built-in DOMParser, so no extra XML dependency is needed.

export interface ChordSymbol {
  /** Root note as written, e.g. "C", "F#", "Bb" */
  root: string;
  /** Everything after the root: "m7", "sus4", "maj7(#11)" — empty string for a plain major triad */
  quality: string;
  /** Slash-chord bass note, e.g. "E" in "C/E" — null if none */
  bass: string | null;
  /** True for a "no chord" (N.C.) marking */
  isNoChord: boolean;
}

export interface MeasureChords {
  /** 0-indexed position in the part — matches OSMD's GraphicSheet.MeasureList indexing */
  measureIndex: number;
  /** Measure number as printed in the score (usually 1-indexed, but not guaranteed numeric) */
  measureNumber: string;
  /** Chord symbols in the order they occur within the measure (usually just one) */
  chords: ChordSymbol[];
}

// MusicXML's <kind> element carries a standardized value (e.g. "major-seventh"),
// but notation software almost always also writes a human-authored `text`
// attribute (e.g. "maj7") which we always prefer — this map is only a
// fallback for when that attribute is missing.
const KIND_FALLBACK_SYMBOLS: Record<string, string> = {
  major: '',
  minor: 'm',
  augmented: '+',
  diminished: 'dim',
  dominant: '7',
  'major-seventh': 'maj7',
  'minor-seventh': 'm7',
  'diminished-seventh': 'dim7',
  'augmented-seventh': '+7',
  'half-diminished': 'm7b5',
  'major-minor': 'mMaj7',
  'major-sixth': '6',
  'minor-sixth': 'm6',
  'dominant-ninth': '9',
  'major-ninth': 'maj9',
  'minor-ninth': 'm9',
  'dominant-11th': '11',
  'major-11th': 'maj11',
  'minor-11th': 'm11',
  'dominant-13th': '13',
  'major-13th': 'maj13',
  'minor-13th': 'm13',
  'suspended-second': 'sus2',
  'suspended-fourth': 'sus4',
  power: '5',
};

function textOf(el: Element | null, tag: string): string | null {
  return el?.querySelector(tag)?.textContent?.trim() || null;
}

function alterToAccidental(alter: string | null): string {
  switch (alter) {
    case '1': return '#';
    case '2': return '##';
    case '-1': return 'b';
    case '-2': return 'bb';
    default: return '';
  }
}

function parseRoot(harmony: Element): string {
  const root = harmony.querySelector('root');
  if (root) {
    return `${textOf(root, 'root-step') ?? ''}${alterToAccidental(textOf(root, 'root-alter'))}`;
  }
  // Rare: Nashville-number / roman-numeral function chords instead of a root
  return textOf(harmony, 'function') ?? '?';
}

function parseKind(harmony: Element): string {
  const kindEl = harmony.querySelector('kind');
  if (!kindEl) return '';
  // An explicit (possibly empty) `text` attribute always wins — it's what
  // was actually typed/displayed in the original notation software.
  if (kindEl.hasAttribute('text')) return kindEl.getAttribute('text') ?? '';
  const value = kindEl.textContent?.trim() ?? '';
  return KIND_FALLBACK_SYMBOLS[value] ?? value;
}

function parseDegrees(harmony: Element): string {
  return Array.from(harmony.querySelectorAll('degree'))
    .map((d) => {
      const type = textOf(d, 'degree-type') ?? 'add';
      const value = textOf(d, 'degree-value') ?? '';
      const alter = alterToAccidental(textOf(d, 'degree-alter'));
      if (type === 'subtract') return `no${value}`;
      if (type === 'alter') return `${alter}${value}`;
      return `add${alter}${value}`;
    })
    .join('');
}

function parseBass(harmony: Element): string | null {
  const bass = harmony.querySelector('bass');
  if (!bass) return null;
  return `${textOf(bass, 'bass-step') ?? ''}${alterToAccidental(textOf(bass, 'bass-alter'))}`;
}

function harmonyToChord(harmony: Element): ChordSymbol {
  const kindEl = harmony.querySelector('kind');
  // A "no chord" marking typically has no <root> at all — handle it before
  // parseRoot() gets a chance to return '?'.
  if (kindEl?.textContent?.trim() === 'none') {
    return { root: kindEl.getAttribute('text') || 'N.C.', quality: '', bass: null, isNoChord: true };
  }
  return {
    root: parseRoot(harmony),
    quality: `${parseKind(harmony)}${parseDegrees(harmony)}`,
    bass: parseBass(harmony),
    isNoChord: false,
  };
}

export function parseChordsFromMusicXml(xml: string): MeasureChords[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) return [];

  const parts = Array.from(doc.querySelectorAll('part'));
  // Chord symbols usually live on one part (the lead/chart part) — take the
  // first part that actually has any, rather than assuming it's part[0].
  const part = parts.find((p) => p.querySelector('harmony')) ?? parts[0];
  if (!part) return [];

  return Array.from(part.querySelectorAll('measure')).map((measure, measureIndex) => ({
    measureIndex,
    measureNumber: measure.getAttribute('number') ?? String(measureIndex + 1),
    chords: Array.from(measure.querySelectorAll('harmony')).map(harmonyToChord),
  }));
}