// Images of critters and capsules for the collection screens.
import { Renderer, type Rendered } from '../iso/engine';
import { toDataUrl } from '../iso/scenes';
import type { AnimLayers } from './art';
import { drawCritter } from './draw';
import { RARITY_COLOR, type Critter, type Rarity } from './roster';

const cache = new Map<string, string>();

function crop(src: Rendered, box: { x: number; y: number; w: number; h: number }): Rendered {
  const pixels = new Uint32Array(box.w * box.h), ids = new Uint16Array(box.w * box.h), objIds = new Uint16Array(box.w * box.h);
  for (let y = 0; y < box.h; y++)
    for (let x = 0; x < box.w; x++) {
      const sx = x + box.x, sy = y + box.y;
      if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) continue;
      const i = sy * src.width + sx, o = y * box.w + x;
      pixels[o] = src.pixels[i];
      ids[o] = src.ids[i];
      objIds[o] = src.objIds[i];
    }
  return { width: box.w, height: box.h, pixels, ids, objIds };
}

function bounds(img: Rendered) {
  let x0 = img.width, y0 = img.height, x1 = 0, y1 = 0;
  for (let i = 0; i < img.pixels.length; i++) {
    if (!img.pixels[i]) continue;
    const x = i % img.width, y = (i - x) / img.width;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}

const TW = 64;
const newRenderer = () => new Renderer(TW, TW + 24, Math.round(TW * 2), TW / 2 + 12, Math.round(TW * 1.25));

/** A critter on a grass tile. Silhouettes are for undiscovered commons and uncommons. */
export function critterIcon(critter: Critter, silhouette = false): string {
  const key = `${critter.key}-${silhouette}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const r = newRenderer();
  r.tile(0, 0);
  drawCritter(r, critter, 0, 0, { silhouette });
  const url = toDataUrl(r.result(2));
  cache.set(key, url);
  return url;
}

/** Layers for animating a legendary or mythic: the critter (obj id 1) and the bare tile. */
export function animLayers(critter: Critter): AnimLayers {
  const make = (withCritter: boolean) => {
    const r = newRenderer();
    r.currentId = 0;
    r.tile(0, 0);
    if (withCritter) {
      r.currentId = 1;
      drawCritter(r, critter, 0, 0);
    }
    return r.result(0, false);
  };
  const base = make(true), ground = make(false);
  const b = bounds(base);
  const box = { x: Math.max(0, b.x0 - 10), y: Math.max(0, b.y0 - 16), w: b.x1 - b.x0 + 21, h: b.y1 - b.y0 + 20 };
  return { base: crop(base, box), ground: crop(ground, box) };
}

/** A sealed capsule standing on a grass tile, with a question mark, for undiscovered rare-and-up slots. */
export function sealedCapsule(rarity: Rarity): string {
  const key = `sealed-${rarity}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const r = newRenderer();
  r.tile(0, 0);
  const [cx, gy] = r.P(0.5, 0.5, 0);
  const rad = 12, cy = gy - rad + 2;
  // Soft shadow on the grass.
  for (let y = -3; y <= 3; y++)
    for (let x = -13; x <= 13; x++) if ((x / 13) ** 2 + (y / 3.5) ** 2 <= 1) r.obj.set(cx + x, gy + 1 + y, 0xff2a4a2a);
  r.commit();
  const RAINBOW = ['#ff7ad9', '#ffb03a', '#f7f06a', '#7ae87a', '#7ae8ff', '#b07aff'];
  const top = (x: number) => r.tones(rarity === 'mythic' ? RAINBOW[Math.min(5, Math.floor(((x + rad) / (2 * rad + 1)) * 6))] : RARITY_COLOR[rarity]);
  const white = r.tones('#f4f0fa'), grey = r.tones('#d8d2e6');
  for (let y = -rad; y <= rad; y++)
    for (let x = -rad; x <= rad; x++) {
      const d = x * x + y * y;
      if (d > rad * rad) continue;
      // The seam tilts a little, following the iso view.
      const seam = y - x * 0.18 - 1;
      const lit = x < -rad * 0.35 && y < -rad * 0.35, dark = x + y > rad * 0.75;
      let c: number;
      if (Math.abs(seam) < 0.8) c = r.tones('#2b2340')[2];
      else if (seam < 0) c = lit ? top(x)[0] : dark ? top(x)[3] : top(x)[2];
      else c = dark ? grey[3] : lit ? white[0] : white[1];
      r.obj.set(cx + x, cy + y, c);
    }
  // Shine.
  for (const [x, y] of [[-8, -7], [-7, -8], [-9, -6], [-8, -6], [-7, -7]]) r.obj.set(cx + x, cy + y, 0xffffffff);
  // A bold question mark with a drop shadow, on the upper half.
  const q = ['.###.', '##.##', '...##', '..##.', '..#..', '.....', '..#..'];
  for (const [dx, dy, ink] of [[1, 1, 0xff402a2b], [0, 0, 0xffe7f8ff]] as const)
    q.forEach((row, ry) =>
      [...row].forEach((ch, rx) => {
        if (ch === '#') r.obj.set(cx - 2 + rx + dx, cy - 11 + ry + dy, ink);
      }),
    );
  r.commit();
  const url = toDataUrl(r.result(2));
  cache.set(key, url);
  return url;
}
