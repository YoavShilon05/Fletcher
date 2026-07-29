import { unzip, zipStore } from './zip';

// MuseScore 4.4+ serializes a key signature as `<concertKey>N</concertKey>`
// (plus `<actualKey>` on transposing parts) inside each `<KeySig>`. webmscore is
// built on the MuseScore 3 engine, whose KeySig reader only understands the
// legacy `<accidental>N</accidental>` child. Given neither, it falls back to C
// major — so the key signature vanishes from the render and every altered note
// is forced to carry an explicit accidental instead.
//
// We rewrite each `<KeySig>` to also carry `<accidental>`, using the *written*
// key (actualKey when present — the transposed signature the part actually
// shows — otherwise concertKey). The original MS4 tags are left in place; the
// MS3 reader simply skips tags it doesn't recognise.
export function convertKeySignatures(mscx: string): string {
  return mscx.replace(/<KeySig>[\s\S]*?<\/KeySig>/g, (block) => {
    if (/<accidental>/.test(block)) return block; // already MS3-readable
    const actual = block.match(/<actualKey>(-?\d+)<\/actualKey>/);
    const concert = block.match(/<concertKey>(-?\d+)<\/concertKey>/);
    const value = actual?.[1] ?? concert?.[1];
    if (value === undefined) return block; // custom/symbolic key sig — leave alone
    return block.replace('<KeySig>', `<KeySig>\n            <accidental>${value}</accidental>`);
  });
}

// MuseScore 4.6+ moved a chord symbol's payload out of `<Harmony>` and into a
// nested `<harmonyInfo>` block, so what used to be
//   <Harmony><root>22</root><name>m</name></Harmony>
// is now
//   <Harmony><harmonyInfo><name>m</name><root>22</root></harmonyInfo></Harmony>
// The MS3 reader skips the unknown `<harmonyInfo>` wholesale, leaving the Harmony
// with no root and no name — it parses as an empty chord and draws nothing, so
// every chord symbol silently disappears from the render (and exports to
// MusicXML as `<kind text="">none</kind>`, which breaks ChordView too).
//
// We hoist the payload back up as direct children. MuseScore can write several
// `<harmonyInfo>` blocks per Harmony (alternate/polychord spellings); MS3 models
// only one, so we take the first. `bass` is MS4's rename of MS3's `base`.
export function convertHarmonies(mscx: string): string {
  return mscx.replace(/<Harmony>[\s\S]*?<\/Harmony>/g, (block) => {
    const info = block.match(/<harmonyInfo>([\s\S]*?)<\/harmonyInfo>/);
    if (!info) return block; // already MS3-readable (MuseScore <= 4.5)

    // What the Harmony already carries at the top level, with every nested
    // <harmonyInfo> removed — otherwise the payload we're about to hoist would
    // read as "already present" and we'd skip it.
    const direct = block.replace(/<harmonyInfo>[\s\S]*?<\/harmonyInfo>/g, '');

    const hoisted: string[] = [];
    for (const [from, to] of [['root', 'root'], ['bass', 'base'], ['name', 'name']] as const) {
      // Don't clobber a value the Harmony already states directly, so a
      // hand-edited or mixed-version file keeps its outer spelling.
      if (new RegExp(`<${to}>`).test(direct)) continue;
      const value = info[1].match(new RegExp(`<${from}>([\\s\\S]*?)</${from}>`));
      if (value) hoisted.push(`<${to}>${value[1]}</${to}>`);
    }
    if (!hoisted.length) return block;

    // The original `<harmonyInfo>` stays put — MS3 ignores tags it can't read.
    return block.replace('<Harmony>', `<Harmony>\n            ${hoisted.join('\n            ')}`);
  });
}

// Normalize a raw .mscz so the MuseScore 3-based webmscore engine renders it
// faithfully. Applied once, up front, to every .mscx in the archive (the main
// score and each Excerpts/ part) before any load/strip/bake pass runs.
export function normalizeMscz(mscz: Uint8Array): Uint8Array {
  const files = unzip(mscz);
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const out: Record<string, Uint8Array> = {};

  for (const [name, data] of Object.entries(files)) {
    if (name.endsWith('.mscx')) {
      out[name] = encoder.encode(convertHarmonies(convertKeySignatures(decoder.decode(data))));
    } else {
      out[name] = data;
    }
  }

  return zipStore(out);
}
