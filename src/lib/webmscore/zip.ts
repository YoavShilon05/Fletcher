import { inflateSync } from 'fflate';

// Minimal ZIP reader/writer for MuseScore .mscz manipulation. fflate's unzipSync
// rejects some MuseScore-produced archives with "invalid zip data" (e.g. Zip64),
// even though the bytes are a valid zip. So we parse the container ourselves and
// reuse fflate only for DEFLATE inflation. The writer stores entries uncompressed
// (method 0) — the output is transient (fed straight to webmscore), so size
// doesn't matter and a store-only writer needs no deflate step.

const EOCD = 0x06054b50;
const EOCD64 = 0x06064b50;
const EOCD64_LOC = 0x07064b50;
const CEN = 0x02014b50;
const LOC = 0x04034b50;

function u16(d: Uint8Array, o: number): number {
  return d[o] | (d[o + 1] << 8);
}
function u32(d: Uint8Array, o: number): number {
  return (d[o] | (d[o + 1] << 8) | (d[o + 2] << 16) | (d[o + 3] << 24)) >>> 0;
}
function u64(d: Uint8Array, o: number): number {
  // JS numbers are exact to 2^53; zip offsets never approach that here.
  return u32(d, o) + u32(d, o + 4) * 0x100000000;
}

export function unzip(data: Uint8Array): Record<string, Uint8Array> {
  // Find the End Of Central Directory record, scanning back over any comment.
  let eocd = -1;
  const minEocd = Math.max(0, data.length - 22 - 0xffff);
  for (let i = data.length - 22; i >= minEocd; i--) {
    if (u32(data, i) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('zip: EOCD not found');

  let cdCount = u16(data, eocd + 10);
  let cdOffset = u32(data, eocd + 16);

  // Zip64: real values live in the Zip64 EOCD, located via a locator before EOCD.
  if (cdOffset === 0xffffffff || cdCount === 0xffff) {
    const locOff = eocd - 20;
    if (locOff >= 0 && u32(data, locOff) === EOCD64_LOC) {
      const z64 = u64(data, locOff + 8);
      if (u32(data, z64) === EOCD64) {
        cdCount = u64(data, z64 + 32);
        cdOffset = u64(data, z64 + 48);
      }
    }
  }

  const decoder = new TextDecoder();
  const files: Record<string, Uint8Array> = {};
  let p = cdOffset;

  for (let i = 0; i < cdCount; i++) {
    if (u32(data, p) !== CEN) break;
    const method = u16(data, p + 10);
    let compSize = u32(data, p + 20);
    let uncompSize = u32(data, p + 24);
    const nameLen = u16(data, p + 28);
    const extraLen = u16(data, p + 30);
    const commentLen = u16(data, p + 32);
    let localOff = u32(data, p + 42);
    const name = decoder.decode(data.subarray(p + 46, p + 46 + nameLen));

    // Resolve Zip64 sizes/offset from the extra field when marked with 0xffffffff.
    if (compSize === 0xffffffff || uncompSize === 0xffffffff || localOff === 0xffffffff) {
      let ep = p + 46 + nameLen;
      const extraEnd = ep + extraLen;
      while (ep + 4 <= extraEnd) {
        const fieldTag = u16(data, ep);
        const fieldSize = u16(data, ep + 2);
        let fp = ep + 4;
        if (fieldTag === 0x0001) {
          if (uncompSize === 0xffffffff) { uncompSize = u64(data, fp); fp += 8; }
          if (compSize === 0xffffffff) { compSize = u64(data, fp); fp += 8; }
          if (localOff === 0xffffffff) { localOff = u64(data, fp); fp += 8; }
        }
        ep += 4 + fieldSize;
      }
    }

    // The central dir's extra field can differ from the local one, so re-read the
    // local header to find where the entry's data actually begins.
    if (u32(data, localOff) !== LOC) throw new Error('zip: bad local header');
    const dataStart = localOff + 30 + u16(data, localOff + 26) + u16(data, localOff + 28);
    const comp = data.subarray(dataStart, dataStart + compSize);

    if (method === 0) files[name] = comp.slice();
    else if (method === 8) files[name] = inflateSync(comp);
    else throw new Error(`zip: unsupported compression method ${method}`);

    p += 46 + nameLen + extraLen + commentLen;
    void uncompSize;
  }

  return files;
}

let crcTable: Uint32Array | null = null;
function crc32(data: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Build a (store-only) zip. Sufficient for handing a modified .mscz to webmscore. */
export function zipStore(files: Record<string, Uint8Array>): Uint8Array {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const crc = crc32(content);
    const size = content.length;

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, LOC, true);
    lv.setUint16(4, 20, true); // version needed
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true); // compressed size (= size, stored)
    lv.setUint32(22, size, true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    locals.push(local, content);

    const cen = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cen.buffer);
    cv.setUint32(0, CEN, true);
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true); // local header offset
    cen.set(nameBytes, 46);
    centrals.push(cen);

    offset += local.length + content.length;
  }

  const count = Object.keys(files).length;
  const cdSize = centrals.reduce((a, c) => a + c.length, 0);
  const cdOffset = offset;

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, EOCD, true);
  ev.setUint16(8, count, true);
  ev.setUint16(10, count, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdOffset, true);

  const out = new Uint8Array(cdOffset + cdSize + eocd.length);
  let o = 0;
  for (const chunk of locals) { out.set(chunk, o); o += chunk.length; }
  for (const chunk of centrals) { out.set(chunk, o); o += chunk.length; }
  out.set(eocd, o);
  return out;
}
