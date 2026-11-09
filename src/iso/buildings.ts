import { PILLAR_INFO } from '../pillars';
import type { Pillar } from '../types';
import { fillPoly, hash, line, type Renderer } from './engine';
import { drawBigFountain, drawLamp, LEVEL_NAMES, LEVELS } from './levels';

export type Level = 1 | 2 | 3;

export type IsoItem =
  | { kind: Pillar; level: Level; variant?: number }
  | { kind: 'lamp'; lit: boolean }
  | { kind: 'plaza'; earned: boolean }
  | { kind: 'wilted' }
  | { kind: 'blossom' }
  | { kind: 'fountain' }
  | { kind: 'lot'; pillar: Pillar };

/** Building level for a number of habits in one pillar on one day. */
export const levelFor = (count: number): Level | 0 => (count <= 0 ? 0 : count >= 3 ? 3 : (count as Level));

export function buildingName(pillar: Pillar, level: Level): string {
  return LEVEL_NAMES[pillar][level - 1];
}

const WALL = '#f0d9a8';
const pick = (list: string[], v: number) => list[v % list.length];

type DrawFn = (r: Renderer, gx: number, gy: number, v: number) => void;

const PILLAR_DRAW: Record<Pillar, DrawFn> = {
  vitality(r, gx, gy, v) {
    const cx = gx + 0.5, cy = gy + 0.5;
    if (v % 3 === 1) {
      r.shadow(gx + 0.25, gy + 0.25, 0.5, 0.5, 0.8);
      r.box(cx - 0.05, cy - 0.05, 0, 0.1, 0.1, 0.2, '#7a4a2a');
      for (let k = 0; k < 3; k++) {
        const s = 0.62 - k * 0.16;
        r.pyramid(cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2, 0.16 + k * 0.24, 0.38, '#2f7a4a');
      }
    } else {
      const leaf = v % 3 === 2 ? '#6cb34f' : '#4f9a43';
      r.shadow(gx + 0.22, gy + 0.22, 0.56, 0.56, 0.7);
      r.box(cx - 0.05, cy - 0.05, 0, 0.1, 0.1, 0.32, '#7a4a2a');
      const [sx, sy] = r.P(cx, cy, 0.66);
      r.blob(sx, sy, r.tw * 0.27, r.tw * 0.24, leaf);
      r.blob(sx - Math.round(r.tw * 0.08), sy - Math.round(r.tw * 0.12), r.tw * 0.14, r.tw * 0.12, v % 3 === 2 ? '#7cc35c' : '#5aa84c');
    }
  },
  mind(r, gx, gy, v) {
    const roof = pick(['#4f7cc9', '#3a5fa8', '#6a9be0'], v);
    const x0 = gx + 0.12, y0 = gy + 0.18, sx = 0.76, sy = 0.62, h = 0.42;
    r.shadow(x0, y0, sx, sy, h + 0.3);
    r.box(x0 - 0.04, y0 - 0.04, 0, sx + 0.08, sy + 0.08, 0.06, '#a9a3b8');
    r.box(x0, y0, 0.06, sx, sy, h, '#8f88a8');
    for (let i = 0; i < 4; i++) {
      const a = x0 + 0.06 + i * 0.19;
      r.faceL(y0 + sy, a, a + 0.07, 0.06, 0.06 + h, r.faces('#eeeaf6').left);
    }
    r.window('R', x0 + sx, y0 + 0.14, y0 + 0.26, 0.22, 0.38, '#7ec8e3');
    r.window('R', x0 + sx, y0 + 0.36, y0 + 0.48, 0.22, 0.38, '#7ec8e3');
    r.box(x0 - 0.03, y0 - 0.03, 0.06 + h, sx + 0.06, sy + 0.06, 0.07, '#eeeaf6');
    r.gable(x0 - 0.03, y0 - 0.03, x0 + sx + 0.03, y0 + sy + 0.03, 0.13 + h, 0.2, roof, '#eeeaf6');
  },
  heart(r, gx, gy, v) {
    const x0 = gx + 0.08, y0 = gy + 0.08, s = 0.84;
    r.box(x0, y0, 0, s, s, 0.06, '#b7b3c4');
    const t = r.tones('#4fa9e0');
    r.poly(
      [r.P(x0 + 0.07, y0 + 0.07, 0.06), r.P(x0 + s - 0.07, y0 + 0.07, 0.06), r.P(x0 + s - 0.07, y0 + s - 0.07, 0.06), r.P(x0 + 0.07, y0 + s - 0.07, 0.06)],
      (x, y, m) => (hash(x, y) < 30 ? t[0] : y < m.minY + (m.maxY - m.minY) * 0.35 ? t[3] : t[2]),
    );
    const [lx, ly] = r.P(x0 + 0.5, y0 + 0.4, 0.06);
    r.blob(lx, ly, r.tw * 0.07, r.tw * 0.04, '#5aa04a');
    const flower = pick(['#f2a0c4', '#e85d5d', '#f7d24a'], v);
    for (const [fx, fy] of [[0.02, 0.5], [0.02, 0.7], [0.3, 0.84], [0.6, 0.84], [0.84, 0.3], [0.84, 0.6]]) {
      r.dot(x0 + fx, y0 + fy, 0.08, '#3f7f35');
      r.dot(x0 + fx, y0 + fy, 0.14, flower);
    }
  },
  spirit(r, gx, gy, v) {
    const red = pick(['#d0453a', '#9b6fd1', '#d9668f'], v);
    r.shadow(gx + 0.15, gy + 0.42, 0.7, 0.14, 0.7);
    r.box(gx + 0.25, gy + 0.45, 0, 0.08, 0.08, 0.64, red);
    r.box(gx + 0.67, gy + 0.45, 0, 0.08, 0.08, 0.64, red);
    r.box(gx + 0.18, gy + 0.46, 0.46, 0.64, 0.06, 0.05, red);
    r.box(gx + 0.12, gy + 0.43, 0.64, 0.76, 0.12, 0.06, red);
    r.box(gx + 0.08, gy + 0.42, 0.7, 0.84, 0.14, 0.04, '#3a2f52');
    r.box(gx + 0.45, gy + 0.7, 0, 0.1, 0.1, 0.06, '#9a96a8');
    r.box(gx + 0.47, gy + 0.72, 0.06, 0.06, 0.06, 0.12, '#b7b3c4');
    r.faceL(gy + 0.78, gx + 0.48, gx + 0.52, 0.09, 0.15, '#f7d24a');
    r.box(gx + 0.44, gy + 0.69, 0.18, 0.12, 0.12, 0.04, '#9a96a8');
  },
  bond(r, gx, gy, v) {
    const roof = pick(['#c8553d', '#e07b39', '#4f7cc9'], v);
    const x0 = gx + 0.18, y0 = gy + 0.2, sx = 0.64, sy = 0.6, h = 0.48;
    r.shadow(x0, y0, sx, sy, h + 0.32);
    r.box(x0, y0, 0, sx, sy, h, WALL);
    r.window('L', y0 + sy, x0 + 0.1, x0 + 0.24, 0.2, 0.36, '#f7d24a');
    r.window('L', y0 + sy, x0 + 0.4, x0 + 0.54, 0.2, 0.36, '#f7d24a');
    r.faceR(x0 + sx, y0 + 0.22, y0 + 0.38, 0, 0.3, '#5e3b22');
    r.gable(x0 - 0.05, y0 - 0.05, x0 + sx + 0.05, y0 + sy + 0.05, h, 0.32, roof, WALL);
  },
  craft(r, gx, gy, v) {
    const roof = pick(['#a0522d', '#5f6f86', '#7a5a8a'], v);
    const x0 = gx + 0.3, y0 = gy + 0.3, s = 0.4, h = 1.0;
    r.shadow(x0, y0, s, s, h + 0.4);
    r.box(x0, y0, 0, s, s, h, '#d9b48a');
    r.faceL(y0 + s, x0 + 0.14, x0 + 0.26, 0, 0.22, '#5e3b22');
    r.faceL(y0 + s, x0 + 0.06, x0 + 0.34, 0.62, 0.92, '#3a2f52');
    r.faceL(y0 + s, x0 + 0.08, x0 + 0.32, 0.65, 0.89, '#fff8e7');
    r.faceL(y0 + s, x0 + 0.19, x0 + 0.21, 0.77, 0.87, '#2b2340');
    r.faceL(y0 + s, x0 + 0.2, x0 + 0.29, 0.76, 0.79, '#2b2340');
    r.window('R', x0 + s, y0 + 0.14, y0 + 0.26, 0.4, 0.55, '#7ec8e3');
    r.box(x0 - 0.03, y0 - 0.03, h, s + 0.06, s + 0.06, 0.05, '#c99a6a');
    r.pyramid(x0 - 0.04, y0 - 0.04, x0 + s + 0.04, y0 + s + 0.04, h + 0.05, 0.42, roof);
  },
  fortune(r, gx, gy, v) {
    const awning = pick(['#d0453a', '#3fa7a0', '#e8913a'], v);
    const x0 = gx + 0.15, y0 = gy + 0.25, sx = 0.7, sy = 0.45;
    r.shadow(x0, y0, sx, sy, 0.7);
    r.box(x0, y0, 0, 0.05, 0.05, 0.58, '#5e3b22');
    r.box(x0 + sx - 0.05, y0, 0, 0.05, 0.05, 0.58, '#5e3b22');
    r.box(x0, y0, 0, sx, sy, 0.24, '#9a6436');
    for (let i = 0; i < 6; i++) r.dot(x0 + 0.08 + i * 0.1, y0 + 0.12 + (i % 2) * 0.12, 0.25, pick(['#f7d24a', '#e8913a', '#d0453a'], i));
    r.box(x0, y0 + sy - 0.05, 0, 0.05, 0.05, 0.58, '#5e3b22');
    r.box(x0 + sx - 0.05, y0 + sy - 0.05, 0, 0.05, 0.05, 0.58, '#5e3b22');
    r.gable(x0 - 0.06, y0 - 0.08, x0 + sx + 0.06, y0 + sy + 0.08, 0.56, 0.16, awning, awning, '#fff8e7');
  },
  harmony(r, gx, gy, v) {
    const crop = pick(['#e8913a', '#d0453a', '#9b6fd1'], v);
    r.box(gx + 0.1, gy + 0.1, 0, 0.8, 0.8, 0.04, '#6b4226');
    // Back rows first so nearer plants overlap farther ones.
    for (let s = 0; s < 7; s++)
      for (let i = 0; i <= s; i++) {
        const j = s - i;
        if (i > 3 || j > 3) continue;
        const px = gx + 0.2 + i * 0.18, py = gy + 0.2 + j * 0.18;
        r.box(px, py, 0.04, 0.06, 0.06, 0.1, '#4f9a43');
        r.dot(px + 0.03, py + 0.03, 0.17, crop);
      }
  },
};

function drawWilted(r: Renderer, gx: number, gy: number) {
  const cx = gx + 0.5, cy = gy + 0.5;
  r.box(gx + 0.2, gy + 0.2, 0, 0.6, 0.6, 0.02, '#8a7a5a');
  r.box(cx - 0.04, cy - 0.04, 0.02, 0.08, 0.08, 0.42, '#5a4636');
  const wood = r.faces('#5a4636').left, top = r.P(cx, cy, 0.44);
  for (const [dx, dy, dz] of [[-0.18, 0.05, 0.62], [0.16, -0.05, 0.6], [0.05, 0.16, 0.66], [-0.05, -0.15, 0.58]]) {
    const end = r.P(cx + dx, cy + dy, dz);
    line(r.obj, top, end, wood);
    line(r.obj, [top[0] + 1, top[1]], [end[0] + 1, end[1]], wood);
  }
}

function drawBlossom(r: Renderer, gx: number, gy: number) {
  const cx = gx + 0.5, cy = gy + 0.5;
  r.shadow(gx + 0.22, gy + 0.22, 0.56, 0.56, 0.7);
  r.box(cx - 0.05, cy - 0.05, 0, 0.1, 0.1, 0.3, '#6b4226');
  const [sx, sy] = r.P(cx, cy, 0.64);
  r.blob(sx, sy, r.tw * 0.26, r.tw * 0.22, '#f2a0c4');
  for (const [fx, fy] of [[0.2, 0.75], [0.7, 0.8], [0.8, 0.4]]) r.dot(gx + fx, gy + fy, 0, '#f7c6da');
}

function drawFountain(r: Renderer, gx: number, gy: number) {
  const cx = gx + 0.5, cy = gy + 0.5;
  r.box(gx + 0.1, gy + 0.1, 0, 0.8, 0.8, 0.14, '#c9c3d6');
  const t = r.tones('#5fb8e8');
  fillPoly(r.obj, [r.P(gx + 0.17, gy + 0.17, 0.14), r.P(gx + 0.83, gy + 0.17, 0.14), r.P(gx + 0.83, gy + 0.83, 0.14), r.P(gx + 0.17, gy + 0.83, 0.14)], (x, y) =>
    hash(x, y) < 50 ? t[0] : t[2],
  );
  r.box(cx - 0.06, cy - 0.06, 0.14, 0.12, 0.12, 0.24, '#e4e0ee');
  r.box(cx - 0.12, cy - 0.12, 0.38, 0.24, 0.24, 0.04, '#e4e0ee');
  for (const [dx, dy, dz] of [[0, 0, 0.56], [-0.1, 0, 0.48], [0.1, 0, 0.48], [0, -0.1, 0.5], [0, 0.1, 0.46]]) r.dot(cx + dx, cy + dy, dz, '#bfe8ff');
}

function drawLot(r: Renderer, gx: number, gy: number, pillar: Pillar) {
  const color = PILLAR_INFO[pillar].color;
  r.dashedDiamond(gx, gy, color);
  r.box(gx + 0.48, gy + 0.48, 0, 0.04, 0.04, 0.26, '#7a4a2a');
  r.faceL(gy + 0.53, gx + 0.38, gx + 0.62, 0.18, 0.3, r.faces(color).left);
}

/** Draws one item standing on cell (gx, gy) and commits it to the scene. */
export function drawItem(r: Renderer, item: IsoItem, gx: number, gy: number) {
  switch (item.kind) {
    case 'wilted':
      drawWilted(r, gx, gy);
      break;
    case 'blossom':
      drawBlossom(r, gx, gy);
      break;
    case 'fountain':
      drawFountain(r, gx, gy);
      break;
    case 'lot':
      drawLot(r, gx, gy, item.pillar);
      break;
    case 'lamp':
      drawLamp(r, gx, gy, item.lit);
      break;
    case 'plaza':
      // Spans a 3x3 block whose top corner is (gx, gy).
      drawBigFountain(r, gx, gy, item.earned);
      break;
    default: {
      const custom = LEVELS[item.kind][item.level - 1];
      if (custom) custom(r, gx, gy);
      else PILLAR_DRAW[item.kind](r, gx, gy, item.variant ?? 0);
    }
  }
  r.commit();
}

/** How tall the tallest item can get, in world units, so scenes leave room above. */
export const MAX_ITEM_HEIGHT = 1.8;
