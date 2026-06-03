/** 產生 PWA 用 PNG 圖示（加入主畫面需要） */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import zlib from "zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../public/icons");
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return (c ^ ~0) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const chunk = Buffer.concat([
    Buffer.from(type),
    data,
  ]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type), data])));
  return Buffer.concat([len, chunk, crc]);
}

function createPng(size) {
  const row = 1 + size * 3;
  const raw = Buffer.alloc(row * size);
  const bg = [12, 16, 24];
  const accent = [56, 189, 148];
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.28;

  for (let y = 0; y < size; y++) {
    const off = y * row;
    raw[off] = 0;
    for (let x = 0; x < size; x++) {
      const i = off + 1 + x * 3;
      const inCircle =
        (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2;
      const [r8, g8, b8] = inCircle ? accent : bg;
      raw[i] = r8;
      raw[i + 1] = g8;
      raw[i + 2] = b8;
    }
  }

  const compressed = zlib.deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  writeFileSync(join(outDir, `icon-${size}.png`), createPng(size));
}
console.log("Icons written to public/icons/");
