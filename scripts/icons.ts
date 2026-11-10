// Renders the app icons from the real island art: node_modules/.bin/vite-node scripts/icons.ts
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { renderDay } from '../src/iso/scenes';
import type { DayBlock } from '../src/town';
import { PILLARS, type Pillar } from '../src/types';

const counts = Object.fromEntries(PILLARS.map((p) => [p, 0])) as Record<Pillar, number>;
Object.assign(counts, { mind: 3, vitality: 3, heart: 2, spirit: 2, bond: 1 });
const big = Object.fromEntries(PILLARS.map((p) => [p, p === 'mind'])) as Record<Pillar, boolean>;
const day = { day: 'icon', active: true, counts, habits: Object.fromEntries(PILLARS.map((p) => [p, []])), pillarsTouched: 5, lampNeed: 5, big, balanced: true } as unknown as DayBlock;

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b: Buffer) => { let c = 0xffffffff; for (const v of b) c = crcTable[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type: string, data: Buffer) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };

/** A square icon: the island scaled up with whole pixels, centered on the app's background. */
function icon(size: number, fill: number, file: string, tw: number) {
  const img = renderDay(day, tw);
  const px = new Uint8Array(img.pixels.buffer);
  let x0 = img.width, y0 = img.height, x1 = 0, y1 = 0;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (px[(y * img.width + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const scale = Math.max(1, Math.floor((size * fill) / Math.max(w, h)));
  const ox = Math.floor((size - w * scale) / 2), oy = Math.floor((size - h * scale) / 2);
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const o = y * (size * 4 + 1) + 1 + x * 4;
      let [r, g, b] = [0x2b, 0x23, 0x40];
      const sx = Math.floor((x - ox) / scale) + x0, sy = Math.floor((y - oy) / scale) + y0;
      if (x >= ox && y >= oy && sx <= x1 && sy <= y1) {
        const i = (sy * img.width + sx) * 4;
        if (px[i + 3]) [r, g, b] = [px[i], px[i + 1], px[i + 2]];
      }
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
icon(180, 0.9, 'public/apple-touch-icon.png', 48);
icon(192, 0.9, 'public/icon-192.png', 48);
icon(512, 0.9, 'public/icon-512.png', 48);
icon(64, 0.98, 'public/favicon.png', 16);
