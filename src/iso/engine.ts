// A tiny isometric pixel-art renderer. Everything is drawn into low-resolution
// pixel buffers with no anti-aliasing, then scaled up on screen.

export type RGB = [number, number, number];
type ColorFn = (x: number, y: number, meta: PolyMeta) => number;
type Fill = number | ColorFn;
export type Pt = [number, number];
interface PolyMeta {
  minY: number;
  maxY: number;
  minX: number;
  maxX: number;
}

export const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const pack = (c: RGB) => ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;
const unpack = (v: number): RGB => [v & 255, (v >> 8) & 255, (v >> 16) & 255];
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB;
const SHADOW = hex('#231a46');
const LIGHT = hex('#fff2c4');

/** Stable per-pixel noise, 0 to 999. */
export const hash = (x: number, y: number) => (((x * 73856093) ^ (y * 19349663) ^ 0x5bd1e995) >>> 0) % 1000;

export class Buf {
  d: Uint32Array;
  x0 = Infinity;
  y0 = Infinity;
  x1 = -1;
  y1 = -1;
  constructor(
    public w: number,
    public h: number,
  ) {
    this.d = new Uint32Array(w * h);
  }
  set(x: number, y: number, v: number) {
    if (!v || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.d[y * this.w + x] = v;
    if (x < this.x0) this.x0 = x;
    if (y < this.y0) this.y0 = y;
    if (x > this.x1) this.x1 = x;
    if (y > this.y1) this.y1 = y;
  }
  get(x: number, y: number) {
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.d[y * this.w + x];
  }
  /** Clears only the area that was drawn on. */
  clear() {
    for (let y = Math.max(0, this.y0); y <= this.y1; y++) this.d.fill(0, y * this.w + Math.max(0, this.x0), y * this.w + this.x1 + 1);
    this.x0 = this.y0 = Infinity;
    this.x1 = this.y1 = -1;
  }
}

export function fillPoly(buf: Buf, pts: Pt[], fill: Fill) {
  let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
  for (const [x, y] of pts) {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
  }
  const meta = { minY, maxY, minX, maxX };
  const n = pts.length;
  for (let y = Math.floor(minY); y < Math.ceil(maxY); y++) {
    const yc = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < n; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % n];
      if ((y0 <= yc && y1 > yc) || (y1 <= yc && y0 > yc)) xs.push(x0 + ((yc - y0) / (y1 - y0)) * (x1 - x0));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) buf.set(x, y, typeof fill === 'function' ? fill(x, y, meta) : fill);
    }
  }
}

export function line(buf: Buf, [x0, y0]: Pt, [x1, y1]: Pt, v: number) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    buf.set(x0, y0, v);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

export interface Faces {
  hi: number;
  top: number;
  left: number;
  right: number;
  ao: number;
}

/** The rendered picture plus, for each pixel, which item (1-based) it belongs to (0 = none). */
export interface Rendered {
  width: number;
  height: number;
  pixels: Uint32Array;
  ids: Uint16Array;
}

/**
 * World units: one cell is 1 x 1, and a height of 1 rises half a tile width on screen.
 * x runs down-right on screen, y runs down-left. Light comes from the top-left.
 */
export class Renderer {
  readonly hw: number;
  readonly hh: number;
  readonly zs: number;
  main: Buf;
  obj: Buf;
  ids: Uint16Array;
  private scratch: Buf;
  private toneCache = new Map<string, number[]>();
  /** The item id the next committed pixels belong to. */
  currentId = 0;

  constructor(
    public tw: number,
    public W: number,
    public H: number,
    private ox: number,
    private oy: number,
  ) {
    this.hw = tw / 2;
    this.hh = tw / 4;
    this.zs = tw / 2;
    this.main = new Buf(W, H);
    this.obj = new Buf(W, H);
    this.scratch = new Buf(W, H);
    this.ids = new Uint16Array(W * H);
  }

  P = (x: number, y: number, z = 0): Pt => [Math.round(this.ox + (x - y) * this.hw), Math.round(this.oy + (x + y) * this.hh - z * this.zs)];

  /** Five shades of a color: highlight, light, base, shade, deep shade. Shadows lean cool, highlights warm. */
  tones(h: string): number[] {
    let t = this.toneCache.get(h);
    if (!t) {
      const b = hex(h);
      t = [mix(b, LIGHT, 0.45), mix(b, LIGHT, 0.18), b, mix(b, SHADOW, 0.32), mix(b, SHADOW, 0.58)].map(pack);
      this.toneCache.set(h, t);
    }
    return t;
  }

  faces(h: string): Faces {
    const t = this.tones(h);
    return { hi: t[0], top: t[1], left: t[2], right: t[3], ao: t[4] };
  }

  /** Walls darken toward the ground through a dithered band. */
  private wall(base: number, ao: number): ColorFn {
    return (x, y, m) => {
      const r = (y - m.minY) / Math.max(1, m.maxY - m.minY);
      if (r > 0.9) return ao;
      if (r > 0.74 && (x + y) & 1) return ao;
      return base;
    };
  }

  poly(pts: Pt[], fill: Fill) {
    fillPoly(this.obj, pts, fill);
  }

  box(x0: number, y0: number, z0: number, sx: number, sy: number, sz: number, color: string) {
    const { P } = this;
    const x1 = x0 + sx, y1 = y0 + sy, z1 = z0 + sz, f = this.faces(color);
    fillPoly(this.obj, [P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], this.wall(f.left, f.ao));
    fillPoly(this.obj, [P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)], this.wall(f.right, f.ao));
    fillPoly(this.obj, [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], f.top);
    if (sz > 0.03) {
      line(this.obj, P(x0, y1, z1), P(x1, y1, z1), f.hi);
      line(this.obj, P(x1, y1, z1), P(x1, y0, z1), f.hi);
    }
  }

  /** A flat rectangle on a front-left wall (plane y = yp). */
  faceL(yp: number, a: number, b: number, za: number, zb: number, fill: Fill | string) {
    const { P } = this;
    fillPoly(this.obj, [P(a, yp, za), P(b, yp, za), P(b, yp, zb), P(a, yp, zb)], typeof fill === 'string' ? pack(hex(fill)) : fill);
  }

  /** A flat rectangle on a front-right wall (plane x = xp). */
  faceR(xp: number, a: number, b: number, za: number, zb: number, fill: Fill | string) {
    const { P } = this;
    fillPoly(this.obj, [P(xp, a, za), P(xp, b, za), P(xp, b, zb), P(xp, a, zb)], typeof fill === 'string' ? pack(hex(fill)) : fill);
  }

  window(side: 'L' | 'R', plane: number, a: number, b: number, za: number, zb: number, color: string) {
    const frame = pack(mix(hex(color), SHADOW, 0.7));
    const glass = pack(hex(color));
    const hi = this.tones(color)[0];
    const face = side === 'L' ? this.faceL.bind(this) : this.faceR.bind(this);
    face(plane, a - 0.02, b + 0.02, za - 0.02, zb + 0.02, frame);
    face(plane, a, b, za, zb, (_x: number, y: number, m: PolyMeta) => (y < m.minY + 1 ? hi : glass));
  }

  /** A gable roof whose ridge runs along x. stripe gives an awning its stripes. */
  gable(x0: number, y0: number, x1: number, y1: number, zb: number, rh: number, color: string, wallColor?: string, stripe?: string) {
    const { P } = this;
    const ym = (y0 + y1) / 2, zr = zb + rh, f = this.faces(color), s = stripe ? this.faces(stripe) : null;
    const pick = (key: keyof Faces): Fill => (s ? (x) => (Math.floor((x - this.ox) / (this.tw * 0.1)) & 1 ? s[key] : f[key]) : f[key]);
    fillPoly(this.obj, [P(x0, y0, zb), P(x1, y0, zb), P(x1, ym, zr), P(x0, ym, zr)], pick('right'));
    fillPoly(this.obj, [P(x1, y0, zb), P(x1, y1, zb), P(x1, ym, zr)], this.faces(wallColor || color).right);
    fillPoly(this.obj, [P(x0, y1, zb), P(x1, y1, zb), P(x1, ym, zr), P(x0, ym, zr)], pick('top'));
    line(this.obj, P(x0, ym, zr), P(x1, ym, zr), f.hi);
  }

  pyramid(x0: number, y0: number, x1: number, y1: number, zb: number, rh: number, color: string) {
    const { P } = this;
    const a = P((x0 + x1) / 2, (y0 + y1) / 2, zb + rh), f = this.faces(color);
    fillPoly(this.obj, [P(x0, y0, zb), P(x1, y0, zb), a], f.left);
    fillPoly(this.obj, [P(x0, y0, zb), P(x0, y1, zb), a], f.hi);
    fillPoly(this.obj, [P(x1, y0, zb), P(x1, y1, zb), a], f.right);
    fillPoly(this.obj, [P(x0, y1, zb), P(x1, y1, zb), a], f.top);
  }

  /** A leafy round canopy, shaded from the top-left with dithered noise. */
  blob(cx: number, cy: number, rx: number, ry: number, color: string) {
    const t = this.tones(color), n = t.length;
    for (let y = -Math.ceil(ry); y <= ry; y++) {
      for (let x = -Math.ceil(rx); x <= rx; x++) {
        if ((x / rx) ** 2 + (y / ry) ** 2 > 1) continue;
        const k = x / rx + y / ry + (hash(cx + x, cy + y) / 1000 - 0.5) * 0.7 + ((x + y) & 1 ? 0.12 : -0.12);
        const idx = Math.max(0, Math.min(n - 1, Math.floor(((k + 1.3) / 2.6) * n)));
        this.obj.set(cx + x, cy + y, t[idx]);
      }
    }
  }

  dot(x: number, y: number, z: number, color: string, size = 2) {
    const [sx, sy] = this.P(x, y, z), v = pack(hex(color));
    for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) this.obj.set(sx + i, sy + j, v);
  }

  /** Darkens what is already drawn, as a shadow cast toward the bottom-right. */
  shadow(x0: number, y0: number, sx: number, sy: number, h: number) {
    const { P, scratch, main } = this;
    const ext = h * 0.55;
    fillPoly(scratch, [P(x0 + 0.05, y0), P(x0 + sx + ext, y0), P(x0 + sx + ext, y0 + sy), P(x0 + 0.05, y0 + sy)], 1);
    for (let y = scratch.y0; y <= scratch.y1; y++)
      for (let x = scratch.x0; x <= scratch.x1; x++) {
        if (!scratch.get(x, y)) continue;
        const cur = main.get(x, y);
        if (cur) main.d[y * this.W + x] = pack(mix(unpack(cur), SHADOW, 0.32));
      }
    scratch.clear();
  }

  /** Outlines the current object in a darker shade of its own colors, then paints it onto the scene. */
  commit() {
    const { obj, main, W, H } = this;
    if (obj.x1 < 0) return;
    const x0 = Math.max(0, obj.x0 - 1), x1 = Math.min(W - 1, obj.x1 + 1), y0 = Math.max(0, obj.y0 - 1), y1 = Math.min(H - 1, obj.y1 + 1);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        if (obj.get(x, y)) continue;
        const n = obj.get(x - 1, y) || obj.get(x + 1, y) || obj.get(x, y - 1) || obj.get(x, y + 1);
        if (!n) continue;
        main.d[y * W + x] = pack(mix(unpack(n), SHADOW, 0.62));
        this.ids[y * W + x] = this.currentId;
      }
    for (let y = obj.y0; y <= obj.y1; y++)
      for (let x = obj.x0; x <= obj.x1; x++) {
        const v = obj.get(x, y);
        if (!v) continue;
        main.d[y * W + x] = v;
        this.ids[y * W + x] = this.currentId;
      }
    obj.clear();
  }

  /** A grass or road tile, drawn straight onto the scene. */
  tile(gx: number, gy: number, kind: 'grass' | 'road' = 'grass') {
    const { P, main } = this;
    const pts: Pt[] = [P(gx, gy), P(gx + 1, gy), P(gx + 1, gy + 1), P(gx, gy + 1)];
    const id = this.currentId;
    const put = (fn: (x: number, y: number) => number) =>
      fillPoly(main, pts, (x, y) => {
        this.ids[y * this.W + x] = id;
        return fn(x, y);
      });
    if (kind === 'road') {
      const t = this.tones('#c9b48a');
      put((x, y) => {
        const h = hash(x, y);
        return h < 90 ? t[3] : h < 200 ? t[1] : (x + 2 * y) % 7 === 0 ? t[3] : t[2];
      });
      return;
    }
    const t = this.tones((gx + gy) & 1 ? '#5aa04a' : '#559a46');
    put((x, y) => {
      const h = hash(x, y);
      if (h < 40) return t[0];
      if (h < 130) return t[1];
      if (h < 220 && (x + y) & 1) return t[3];
      return t[2];
    });
  }

  dashedDiamond(gx: number, gy: number, color: string) {
    const { P, main, scratch } = this;
    // Dashes in the pillar's color. A color too close to the grass (Vitality's green) swaps to a bright lime so it still shows.
    const c0 = hex(color), grass = hex('#5aa04a');
    const nearGrass = Math.hypot(c0[0] - grass[0], c0[1] - grass[1], c0[2] - grass[2]) < 60;
    const v = pack(nearGrass ? hex('#c8f560') : c0), ins = 0.12;
    const c: Pt[] = [P(gx + ins, gy + ins), P(gx + 1 - ins, gy + ins), P(gx + 1 - ins, gy + 1 - ins), P(gx + ins, gy + 1 - ins)];
    for (let i = 0; i < 4; i++) line(scratch, c[i], c[(i + 1) % 4], 1);
    for (let y = scratch.y0; y <= scratch.y1; y++)
      for (let x = scratch.x0; x <= scratch.x1; x++) if (scratch.get(x, y) && (x >> 1) & 1) main.d[y * this.W + x] = v;
    scratch.clear();
  }

  /** Crops the scene to what was drawn, plus a margin. */
  result(margin = 4): Rendered {
    const { W, H, main } = this;
    let bx0 = W, by0 = H, bx1 = 0, by1 = 0;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (main.d[y * W + x]) {
          if (x < bx0) bx0 = x;
          if (x > bx1) bx1 = x;
          if (y < by0) by0 = y;
          if (y > by1) by1 = y;
        }
    if (bx1 < bx0) return { width: 1, height: 1, pixels: new Uint32Array(1), ids: new Uint16Array(1) };
    const cw = bx1 - bx0 + 1 + 2 * margin, ch = by1 - by0 + 1 + 2 * margin;
    const pixels = new Uint32Array(cw * ch), ids = new Uint16Array(cw * ch);
    for (let y = by0; y <= by1; y++)
      for (let x = bx0; x <= bx1; x++) {
        const o = (y - by0 + margin) * cw + (x - bx0 + margin);
        pixels[o] = main.d[y * W + x];
        ids[o] = this.ids[y * W + x];
      }
    return { width: cw, height: ch, pixels, ids };
  }
}
