import { unzip, zipStore } from './zip';

// Force multimeasure rests OFF in a score/part style. Instrument parts collapse
// consecutive empty bars into one numbered rest by default, which desyncs our
// per-measure highlight (positions.elements would have fewer entries than the
// song has measures). Applied to each extracted part's own .mscx before reload,
// since generateExcerpts() re-enables MM rests on generated parts.
export function disableMultiMeasureRests(mscx: string): string {
  if (/<createMultiMeasureRests>/.test(mscx)) {
    return mscx.replace(
      /<createMultiMeasureRests>[^<]*<\/createMultiMeasureRests>/g,
      '<createMultiMeasureRests>0</createMultiMeasureRests>',
    );
  }
  // No explicit setting — inject one into the (first) <Style> block.
  return mscx.replace('<Style>', '<Style>\n      <createMultiMeasureRests>0</createMultiMeasureRests>');
}

// MuseScore stores linked parts (excerpts) as <Excerpt> elements inside the main
// .mscx and, for some versions, as separate files under Excerpts/. A file may
// ship hand-made excerpts that cover only some instruments — and once any exist,
// webmscore's generateExcerpts() is a no-op.
//
// Removing both the <Excerpt> elements and the Excerpts/ files yields a score
// with no excerpts, so generateExcerpts() rebuilds exactly one per instrument
// from the real part/staff data. This preserves what a MusicXML round-trip
// loses: manual TAB string assignments and multi-staff (e.g. piano) grouping.
export function stripExcerpts(mscz: Uint8Array): Uint8Array {
  const files = unzip(mscz);
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const out: Record<string, Uint8Array> = {};

  for (const [name, data] of Object.entries(files)) {
    if (name.startsWith('Excerpts/')) continue; // drop separate excerpt part files

    if (name.endsWith('.mscx')) {
      let xml = decoder.decode(data);
      // <Excerpt> blocks are never nested, so a non-greedy match is safe even
      // when an excerpt embeds a full <Score> (MuseScore 3).
      xml = xml.replace(/[\t ]*<Excerpt[\s>][\s\S]*?<\/Excerpt>\s*/g, '');
      xml = disableMultiMeasureRests(xml);
      out[name] = encoder.encode(xml);
    } else if (name === 'META-INF/container.xml') {
      // Drop dangling rootfile references to the excerpt files we removed.
      const xml = decoder.decode(data);
      out[name] = encoder.encode(xml.replace(/[\t ]*<rootfile[^>]*Excerpts\/[^>]*>\s*/g, ''));
    } else {
      out[name] = data;
    }
  }

  return zipStore(out);
}
