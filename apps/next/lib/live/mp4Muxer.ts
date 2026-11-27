export interface EncodedMp4Sample {
  data: Uint8Array;
  durationTicks: number;
  isKeyframe: boolean;
}

export interface IsoBmffMp4Input {
  width: number;
  height: number;
  timescale?: number;
  samples: EncodedMp4Sample[];
  avcDecoderConfig?: Uint8Array;
}

function writeUint16BE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = (value >>> 8) & 0xff;
  buf[offset + 1] = value & 0xff;
}

function writeUint32BE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = (value >>> 24) & 0xff;
  buf[offset + 1] = (value >>> 16) & 0xff;
  buf[offset + 2] = (value >>> 8) & 0xff;
  buf[offset + 3] = value & 0xff;
}

function asciiBytes(str: string): Uint8Array {
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    out[i] = str.charCodeAt(i) & 0xff;
  }
  return out;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

function box(type: string, ...payloads: Uint8Array[]): Uint8Array {
  const body = concatBytes(payloads);
  const out = new Uint8Array(8 + body.length);
  writeUint32BE(out, 0, out.length);
  out.set(asciiBytes(type), 4);
  out.set(body, 8);
  return out;
}

function fullBox(type: string, version: number, flags: number, ...payloads: Uint8Array[]): Uint8Array {
  const header = new Uint8Array(4);
  header[0] = version & 0xff;
  header[1] = (flags >>> 16) & 0xff;
  header[2] = (flags >>> 8) & 0xff;
  header[3] = flags & 0xff;
  return box(type, header, ...payloads);
}

function u32ArrayBox(entries: number[]): Uint8Array {
  const out = new Uint8Array(entries.length * 4);
  for (let i = 0; i < entries.length; i++) {
    writeUint32BE(out, i * 4, entries[i]);
  }
  return out;
}

function defaultAvcC(): Uint8Array {
  // Minimal valid AVCDecoderConfigurationRecord fallback (Baseline Level 3.1)
  return new Uint8Array([0x01, 0x42, 0xe0, 0x1f, 0xff, 0xe1, 0x00, 0x00, 0x01, 0x00, 0x00]);
}

function buildMoovBox(input: IsoBmffMp4Input, mdatDataOffset: number): Uint8Array {
  const timescale = input.timescale ?? 30_000;
  const totalDuration = input.samples.reduce((s, sample) => s + sample.durationTicks, 0);

  const mvhdPayload = new Uint8Array(96);
  writeUint32BE(mvhdPayload, 8, timescale);
  writeUint32BE(mvhdPayload, 12, totalDuration);
  writeUint32BE(mvhdPayload, 16, 0x00010000); // 1.0 rate
  writeUint16BE(mvhdPayload, 20, 0x0100); // 1.0 volume
  // Identity matrix
  writeUint32BE(mvhdPayload, 32, 0x00010000);
  writeUint32BE(mvhdPayload, 48, 0x00010000);
  writeUint32BE(mvhdPayload, 64, 0x40000000);
  writeUint32BE(mvhdPayload, 92, 2); // next_track_id
  const mvhd = fullBox('mvhd', 0, 0, mvhdPayload);

  const tkhdPayload = new Uint8Array(80);
  writeUint32BE(tkhdPayload, 8, 1); // track_id
  writeUint32BE(tkhdPayload, 16, totalDuration);
  writeUint32BE(tkhdPayload, 36, 0x00010000);
  writeUint32BE(tkhdPayload, 52, 0x00010000);
  writeUint32BE(tkhdPayload, 68, 0x40000000);
  writeUint32BE(tkhdPayload, 72, (input.width & 0xffff) << 16);
  writeUint32BE(tkhdPayload, 76, (input.height & 0xffff) << 16);
  const tkhd = fullBox('tkhd', 0, 0x000003, tkhdPayload);

  const mdhdPayload = new Uint8Array(20);
  writeUint32BE(mdhdPayload, 8, timescale);
  writeUint32BE(mdhdPayload, 12, totalDuration);
  writeUint16BE(mdhdPayload, 16, 0x55c4); // 'und'
  const mdhd = fullBox('mdhd', 0, 0, mdhdPayload);

  const hdlr = fullBox('hdlr', 0, 0, new Uint8Array(4), asciiBytes('vide'), new Uint8Array(12), asciiBytes('VideoHandler\0'));
  const vmhd = fullBox('vmhd', 0, 1, new Uint8Array(8));
  const urlBox = fullBox('url ', 0, 1);
  const dref = fullBox('dref', 0, 0, u32ArrayBox([1]), urlBox);
  const dinf = box('dinf', dref);

  const avcC = box('avcC', input.avcDecoderConfig ?? defaultAvcC());
  const avc1Header = new Uint8Array(78);
  writeUint16BE(avc1Header, 6, 1); // data_reference_index
  writeUint16BE(avc1Header, 24, input.width);
  writeUint16BE(avc1Header, 26, input.height);
  writeUint32BE(avc1Header, 28, 0x00480000);
  writeUint32BE(avc1Header, 32, 0x00480000);
  writeUint16BE(avc1Header, 40, 1);
  writeUint16BE(avc1Header, 74, 24);
  writeUint16BE(avc1Header, 76, 0xffff);
  const avc1 = box('avc1', avc1Header, avcC);
  const stsd = fullBox('stsd', 0, 0, u32ArrayBox([1]), avc1);

  const sttsEntries: number[] = [input.samples.length];
  for (const s of input.samples) {
    sttsEntries.push(1, Math.max(1, Math.round(s.durationTicks)));
  }
  const stts = fullBox('stts', 0, 0, u32ArrayBox(sttsEntries));

  const keyIndices = input.samples
    .map((s, i) => (s.isKeyframe ? i + 1 : -1))
    .filter((i) => i > 0);
  const stss = fullBox('stss', 0, 0, u32ArrayBox([keyIndices.length, ...keyIndices]));
  const stsc = fullBox('stsc', 0, 0, u32ArrayBox([1, 1, input.samples.length, 1]));
  const stsz = fullBox('stsz', 0, 0, u32ArrayBox([0, input.samples.length, ...input.samples.map((s) => s.data.length)]));
  const stco = fullBox('stco', 0, 0, u32ArrayBox([1, mdatDataOffset]));

  const stbl = box('stbl', stsd, stts, stss, stsc, stsz, stco);
  const minf = box('minf', vmhd, dinf, stbl);
  const mdia = box('mdia', mdhd, hdlr, minf);
  const trak = box('trak', tkhd, mdia);

  return box('moov', mvhd, trak);
}

/**
 * Packages encoded H.264 video chunks into a compliant single-track ISO BMFF MP4 buffer.
 */
export function buildIsoBmffMp4(input: IsoBmffMp4Input): Uint8Array {
  if (!input.samples || input.samples.length === 0) {
    throw new Error('At least one encoded video sample is required to build an MP4.');
  }
  if (input.width <= 0 || input.height <= 0) {
    throw new Error('Video dimensions must be positive.');
  }

  const ftyp = box('ftyp', asciiBytes('isom'), u32ArrayBox([512]), asciiBytes('isomiso2avc1mp41'));
  const mdatPayload = concatBytes(input.samples.map((s) => s.data));
  const mdat = box('mdat', mdatPayload);

  // Two-pass moov build so stco offset points accurately past ftyp + moov + mdat header (8 bytes)
  const draftMoov = buildMoovBox(input, 0);
  const mdatDataOffset = ftyp.length + draftMoov.length + 8;
  const finalMoov = buildMoovBox(input, mdatDataOffset);

  return concatBytes([ftyp, finalMoov, mdat]);
}
