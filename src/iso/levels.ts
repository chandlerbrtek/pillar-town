// Three building levels for each pillar, plus the day lamp and the week's plaza.
// Levels marked null reuse the original buildings in buildings.ts.
import { fillPoly, hash, line, pack, hex, type Renderer } from './engine';
import type { Pillar } from '../types';

export type Draw = (r: Renderer, gx: number, gy: number) => void;
const WALL = '#f0d9a8';


function roundTree(r: Renderer, cx: number, cy: number, s: number, leaf: string) {
  r.box(cx - 0.04 * s, cy - 0.04 * s, 0, 0.08 * s, 0.08 * s, 0.3 * s, '#7a4a2a');
  const [sx, sy] = r.P(cx, cy, 0.62 * s);
  r.blob(sx, sy, r.tw * 0.25 * s, r.tw * 0.22 * s, leaf);
}

function pine(r: Renderer, cx: number, cy: number, s: number) {
  r.box(cx - 0.04 * s, cy - 0.04 * s, 0, 0.08 * s, 0.08 * s, 0.18 * s, '#7a4a2a');
  for (let k = 0; k < 3; k++) {
    const w = (0.5 - k * 0.13) * s;
    r.pyramid(cx - w / 2, cy - w / 2, cx + w / 2, cy + w / 2, (0.14 + k * 0.2) * s, 0.32 * s, '#2f7a4a');
  }
}

function cart(r: Renderer, gx: number, gy: number, load: (r: Renderer, x: number, y: number) => void) {
  const x0 = gx + 0.28, y0 = gy + 0.34;
  r.shadow(x0, y0, 0.44, 0.3, 0.3);
  r.box(x0, y0, 0.08, 0.44, 0.3, 0.12, '#9a6436');
  r.faceL(y0 + 0.3, x0 + 0.04, x0 + 0.13, 0, 0.09, '#3a2f52');
  r.faceL(y0 + 0.3, x0 + 0.3, x0 + 0.39, 0, 0.09, '#3a2f52');
  line(r.obj, r.P(x0, y0 + 0.15, 0.18), r.P(x0 - 0.16, y0 + 0.15, 0.1), r.faces('#5e3b22').left);
  load(r, x0, y0);
}

/** Index 0 is level 1, index 2 is level 3. null means the original building from buildings.ts. */
export const LEVELS: Record<Pillar, [Draw | null, Draw | null, Draw | null]> = {
  vitality: [
    (r, gx, gy) => {
      r.box(gx + 0.47, gy + 0.47, 0, 0.06, 0.06, 0.16, '#7a4a2a');
      const [sx, sy] = r.P(gx + 0.5, gy + 0.5, 0.3);
      r.blob(sx, sy, r.tw * 0.12, r.tw * 0.1, '#6cb34f');
      r.commit();
    },
    null,
    (r, gx, gy) => {
      r.shadow(gx + 0.1, gy + 0.1, 0.8, 0.8, 0.8);
      pine(r, gx + 0.3, gy + 0.32, 1.05);
      roundTree(r, gx + 0.72, gy + 0.3, 0.75, '#6cb34f');
      roundTree(r, gx + 0.55, gy + 0.68, 1.05, '#4f9a43');
      r.commit();
    },
  ],
  mind: [
    (r, gx, gy) => {
      cart(r, gx, gy, (r, x0, y0) => {
        ['#d0453a', '#4f7cc9', '#5aa04a', '#f7d24a'].forEach((c, i) => r.box(x0 + 0.05 + i * 0.09, y0 + 0.06, 0.2, 0.06, 0.18, 0.1 + (i % 2) * 0.03, c));
      });
      r.commit();
    },
    (r, gx, gy) => {
      const x0 = gx + 0.15, y0 = gy + 0.2, sx = 0.7, sy = 0.6, h = 0.46;
      r.shadow(x0, y0, sx, sy, h + 0.3);
      r.box(x0, y0, 0, sx, sy, h, '#e8dcc0');
      r.faceL(y0 + sy, x0 + 0.06, x0 + 0.44, 0.08, 0.34, '#3a2f52');
      ['#d0453a', '#4f7cc9', '#5aa04a', '#f7d24a', '#9b6fd1', '#e8913a'].forEach((c, i) => r.faceL(y0 + sy, x0 + 0.08 + i * 0.06, x0 + 0.12 + i * 0.06, 0.1, 0.2 + (i % 3) * 0.03, c));
      r.faceL(y0 + sy, x0 + 0.08, x0 + 0.42, 0.25, 0.27, '#9a6436');
      r.faceL(y0 + sy, x0 + 0.5, x0 + 0.64, 0, 0.3, '#5e3b22');
      r.faceL(y0 + sy, x0 + 0.08, x0 + 0.42, 0.37, 0.44, '#f7d24a');
      r.window('R', x0 + sx, y0 + 0.2, y0 + 0.4, 0.2, 0.36, '#7ec8e3');
      r.gable(x0 - 0.04, y0 - 0.04, x0 + sx + 0.04, y0 + sy + 0.04, h, 0.3, '#3a5fa8', '#e8dcc0');
      r.commit();
    },
    null,
  ],
  heart: [
    (r, gx, gy) => {
      r.box(gx + 0.2, gy + 0.2, 0, 0.6, 0.6, 0.06, '#6b4226');
      const colors = ['#f2a0c4', '#e85d5d', '#f7d24a'];
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) {
          r.dot(gx + 0.3 + i * 0.18, gy + 0.3 + j * 0.18, 0.1, '#3f7f35');
          r.dot(gx + 0.3 + i * 0.18, gy + 0.3 + j * 0.18, 0.18, colors[(i + j) % 3], 3);
        }
      r.commit();
    },
    null,
    (r, gx, gy) => {
      // Small pond at the back, a gazebo at the front.
      const x0 = gx + 0.05, y0 = gy + 0.05, s = 0.5;
      r.box(x0, y0, 0, s, s, 0.05, '#b7b3c4');
      const t = r.tones('#4fa9e0');
      fillPoly(r.obj, [r.P(x0 + 0.05, y0 + 0.05, 0.05), r.P(x0 + s - 0.05, y0 + 0.05, 0.05), r.P(x0 + s - 0.05, y0 + s - 0.05, 0.05), r.P(x0 + 0.05, y0 + s - 0.05, 0.05)], (x, y) => (hash(x, y) < 40 ? t[0] : t[2]));
      r.commit();
      const g0 = gx + 0.5, h0 = gy + 0.48, w = 0.38;
      r.shadow(g0, h0, w, w, 0.6);
      r.box(g0, h0, 0, w, w, 0.04, '#c9c3d6');
      for (const [px, py] of [[0, 0], [w - 0.05, 0], [0, w - 0.05], [w - 0.05, w - 0.05]]) r.box(g0 + px, h0 + py, 0.04, 0.05, 0.05, 0.3, '#fff8e7');
      r.pyramid(g0 - 0.05, h0 - 0.05, g0 + w + 0.05, h0 + w + 0.05, 0.34, 0.24, '#d9668f');
      for (const [fx, fy] of [[0.1, 0.8], [0.3, 0.92], [0.92, 0.3], [0.62, 0.1]]) r.dot(gx + fx, gy + fy, 0.08, '#f2a0c4');
      r.commit();
    },
  ],
  spirit: [
    (r, gx, gy) => {
      const cx = gx + 0.5, cy = gy + 0.5;
      r.box(cx - 0.12, cy - 0.12, 0, 0.24, 0.24, 0.06, '#9a96a8');
      r.box(cx - 0.05, cy - 0.05, 0.06, 0.1, 0.1, 0.2, '#b7b3c4');
      r.box(cx - 0.1, cy - 0.1, 0.26, 0.2, 0.2, 0.14, '#b7b3c4');
      r.faceL(cy + 0.1, cx - 0.05, cx + 0.05, 0.29, 0.37, '#f7d24a');
      r.faceR(cx + 0.1, cy - 0.05, cy + 0.05, 0.29, 0.37, '#f7d24a');
      r.pyramid(cx - 0.15, cy - 0.15, cx + 0.15, cy + 0.15, 0.4, 0.14, '#6a6a78');
      r.commit();
    },
    null,
    (r, gx, gy) => {
      const x0 = gx + 0.18, y0 = gy + 0.12, sx = 0.64, sy = 0.52;
      r.shadow(x0, y0, sx, sy, 0.8);
      r.box(x0 - 0.06, y0 - 0.06, 0, sx + 0.12, sy + 0.12, 0.08, '#9a96a8');
      r.box(x0, y0, 0.08, sx, sy, 0.34, '#f0e6d0');
      for (const a of [0, 0.29, 0.58]) r.faceL(y0 + sy, x0 + a, x0 + a + 0.06, 0.08, 0.42, '#d0453a');
      r.faceL(y0 + sy, x0 + 0.1, x0 + 0.24, 0.12, 0.34, '#5e3b22');
      r.faceL(y0 + sy, x0 + 0.38, x0 + 0.52, 0.12, 0.34, '#5e3b22');
      r.gable(x0 - 0.1, y0 - 0.08, x0 + sx + 0.1, y0 + sy + 0.08, 0.42, 0.3, '#3a2f52', '#f0e6d0');
      r.box(gx + 0.46, gy + 0.8, 0, 0.08, 0.08, 0.16, '#b7b3c4');
      r.faceL(gy + 0.88, gx + 0.475, gx + 0.525, 0.08, 0.14, '#f7d24a');
      r.commit();
    },
  ],
  bond: [
    (r, gx, gy) => {
      r.shadow(gx + 0.25, gy + 0.25, 0.5, 0.5, 0.45);
      r.pyramid(gx + 0.25, gy + 0.25, gx + 0.75, gy + 0.75, 0, 0.5, '#e8913a');
      const [dx, dy] = r.P(gx + 0.42, gy + 0.75, 0);
      fillPoly(r.obj, [[dx, dy], [dx + Math.round(r.tw * 0.12), dy + Math.round(r.tw * 0.06)], [dx + Math.round(r.tw * 0.06), dy - Math.round(r.tw * 0.16)]], pack(hex('#3a2f52')));
      r.commit();
    },
    null,
    (r, gx, gy) => {
      r.shadow(gx + 0.08, gy + 0.1, 0.84, 0.75, 0.9);
      r.box(gx + 0.08, gy + 0.08, 0, 0.55, 0.5, 0.6, WALL);
      r.window('L', gy + 0.58, gx + 0.14, gx + 0.26, 0.3, 0.46, '#f7d24a');
      r.window('L', gy + 0.58, gx + 0.4, gx + 0.52, 0.3, 0.46, '#f7d24a');
      r.box(gx + 0.48, gy + 0.18, 0.6, 0.08, 0.08, 0.3, '#9a6a5a');
      r.gable(gx + 0.04, gy + 0.04, gx + 0.67, gy + 0.62, 0.6, 0.34, '#c8553d', WALL);
      r.box(gx + 0.55, gy + 0.32, 0, 0.32, 0.36, 0.4, WALL);
      r.faceR(gx + 0.87, gy + 0.42, gy + 0.56, 0, 0.26, '#5e3b22');
      r.window('L', gy + 0.68, gx + 0.62, gx + 0.76, 0.16, 0.3, '#f7d24a');
      r.gable(gx + 0.52, gy + 0.29, gx + 0.9, gy + 0.71, 0.4, 0.22, '#c8553d', WALL);
      for (let i = 0; i < 6; i++) r.dot(gx + 0.08 + i * 0.1, gy + 0.92, 0.06, i % 2 ? '#f2a0c4' : '#fff8e7');
      r.commit();
    },
  ],
  craft: [
    (r, gx, gy) => {
      const x0 = gx + 0.25, y0 = gy + 0.35;
      for (const [px, py] of [[0, 0], [0.44, 0], [0, 0.24], [0.44, 0.24]]) r.box(x0 + px, y0 + py, 0, 0.05, 0.05, 0.22, '#5e3b22');
      r.box(x0 - 0.02, y0 - 0.02, 0.22, 0.53, 0.33, 0.05, '#9a6436');
      r.box(x0 + 0.08, y0 + 0.08, 0.27, 0.12, 0.08, 0.06, '#9a96a8');
      r.dot(x0 + 0.34, y0 + 0.14, 0.28, '#6a6a78');
      r.dot(x0 + 0.4, y0 + 0.1, 0.28, '#d0453a');
      r.commit();
    },
    (r, gx, gy) => {
      const x0 = gx + 0.15, y0 = gy + 0.2, sx = 0.68, sy = 0.58, h = 0.42;
      r.shadow(x0, y0, sx, sy, h + 0.4);
      r.box(x0, y0, 0, sx, sy, h, '#b08a6a');
      r.window('L', y0 + sy, x0 + 0.08, x0 + 0.24, 0.18, 0.32, '#7ec8e3');
      r.window('L', y0 + sy, x0 + 0.36, x0 + 0.52, 0.18, 0.32, '#7ec8e3');
      r.faceR(x0 + sx, y0 + 0.12, y0 + 0.46, 0, 0.32, '#5e3b22');
      r.faceR(x0 + sx, y0 + 0.28, y0 + 0.3, 0, 0.32, '#3a2f52');
      r.box(x0 + 0.48, y0 + 0.08, h, 0.1, 0.1, 0.36, '#6a6a78');
      r.gable(x0 - 0.04, y0 - 0.04, x0 + sx + 0.04, y0 + sy + 0.04, h, 0.26, '#6a7a8a', '#b08a6a');
      for (const [dx, dz] of [[0, 0.88], [0.04, 0.96], [-0.02, 1.04]]) r.dot(x0 + 0.53 + dx, y0 + 0.13, dz, '#d8d4e4', 3);
      r.commit();
    },
    null,
  ],
  fortune: [
    (r, gx, gy) => {
      cart(r, gx, gy, (r, x0, y0) => {
        for (let i = 0; i < 4; i++) r.dot(x0 + 0.08 + i * 0.09, y0 + 0.12, 0.22, i % 2 ? '#e8913a' : '#f7d24a');
        r.box(x0 + 0.2, y0 + 0.13, 0.2, 0.03, 0.03, 0.34, '#5e3b22');
        r.pyramid(x0 + 0.02, y0 - 0.04, x0 + 0.42, y0 + 0.34, 0.54, 0.14, '#d0453a');
      });
      r.commit();
    },
    null,
    (r, gx, gy) => {
      const x0 = gx + 0.12, y0 = gy + 0.16, sx = 0.76, sy = 0.62, h = 0.46;
      r.shadow(x0, y0, sx, sy, h + 0.3);
      r.box(x0 - 0.04, y0 - 0.04, 0, sx + 0.08, sy + 0.08, 0.06, '#a9a3b8');
      r.box(x0, y0, 0.06, sx, sy, h, '#c9c3d6');
      for (let i = 0; i < 5; i++) r.faceL(y0 + sy, x0 + 0.04 + i * 0.16, x0 + 0.1 + i * 0.16, 0.06, 0.06 + h, r.faces('#f4f0fa').left);
      r.faceR(x0 + sx, y0 + 0.22, y0 + 0.4, 0.06, 0.34, '#5e3b22');
      r.box(x0 - 0.03, y0 - 0.03, 0.06 + h, sx + 0.06, sy + 0.06, 0.07, '#f4f0fa');
      r.gable(x0 - 0.03, y0 - 0.03, x0 + sx + 0.03, y0 + sy + 0.03, 0.13 + h, 0.22, '#d4b03a', '#f4f0fa');
      const [cx, cy] = r.P(x0 + sx, y0 + sy / 2, 0.13 + h + 0.08);
      r.blob(cx - Math.round(r.tw * 0.04), cy + 1, r.tw * 0.05, r.tw * 0.05, '#f7d24a');
      r.commit();
    },
  ],
  harmony: [
    (r, gx, gy) => {
      r.box(gx + 0.36, gy + 0.36, 0, 0.28, 0.28, 0.14, '#a0522d');
      r.box(gx + 0.38, gy + 0.38, 0.14, 0.24, 0.24, 0.02, '#5e3b22');
      const [sx, sy] = r.P(gx + 0.5, gy + 0.5, 0.26);
      r.blob(sx, sy, r.tw * 0.1, r.tw * 0.08, '#5aa04a');
      r.dot(gx + 0.48, gy + 0.48, 0.32, '#e8913a');
      r.commit();
    },
    null,
    (r, gx, gy) => {
      const x0 = gx + 0.33, y0 = gy + 0.33, s = 0.34, h = 0.8;
      r.shadow(x0, y0, s, s, h + 0.4);
      r.box(x0, y0, 0, s, s, h, '#f0d9a8');
      r.faceL(y0 + s, x0 + 0.12, x0 + 0.22, 0, 0.2, '#5e3b22');
      r.window('R', x0 + s, y0 + 0.12, y0 + 0.22, 0.45, 0.58, '#7ec8e3');
      r.pyramid(x0 - 0.05, y0 - 0.05, x0 + s + 0.05, y0 + s + 0.05, h, 0.3, '#c8553d');
      // Sails on the front-left face.
      const hub = r.P(x0 + s / 2, y0 + s + 0.04, h - 0.08);
      const sail = r.faces('#fff8e7').top, wood = r.faces('#7a4a2a').left;
      const len = r.tw * 0.42;
      for (const [ax, ay] of [[1, -0.5], [-1, 0.5], [0.45, 0.9], [-0.45, -0.9]]) {
        const end: [number, number] = [Math.round(hub[0] + ax * len), Math.round(hub[1] + ay * len)];
        line(r.obj, hub, end, wood);
        line(r.obj, [hub[0] + 1, hub[1]], [end[0] + 1, end[1]], sail);
        line(r.obj, [hub[0] + 2, hub[1] + 1], [end[0] + 2, end[1] + 1], sail);
      }
      r.dot(x0 + s / 2, y0 + s + 0.04, h - 0.08, '#3a2f52', 3);
      r.commit();
    },
  ],
};

export const LEVEL_NAMES: Record<Pillar, [string, string, string]> = {
  vitality: ['Sapling', 'Tree', 'Grove'],
  mind: ['Book cart', 'Bookshop', 'Library'],
  heart: ['Flower bed', 'Pond', 'Garden gazebo'],
  spirit: ['Stone lantern', 'Shrine gate', 'Shrine'],
  bond: ['Tent', 'Cottage', 'House with garden'],
  craft: ['Workbench', 'Workshop', 'Clock tower'],
  fortune: ['Cart', 'Market stall', 'Bank'],
  harmony: ['Planter', 'Garden', 'Windmill'],
};

/** The lamp at the center of a day block; lit on a balanced day. */
export function drawLamp(r: Renderer, gx: number, gy: number, lit: boolean) {
  r.box(gx + 0.46, gy + 0.46, 0, 0.08, 0.08, 0.6, '#3a2f52');
  r.box(gx + 0.41, gy + 0.41, 0.6, 0.18, 0.18, 0.14, lit ? '#f7d24a' : '#6a6a78');
  r.pyramid(gx + 0.39, gy + 0.39, gx + 0.61, gy + 0.61, 0.74, 0.08, '#3a2f52');
  if (lit) for (const [dx, dy, dz] of [[-0.18, 0, 0.7], [0.18, 0, 0.62], [0, -0.18, 0.78], [0, 0.18, 0.56]]) r.dot(gx + 0.5 + dx, gy + 0.5 + dy, dz, '#fff2a8');
  r.commit();
}

/** A big fountain spanning a whole 3x3 block, for a full week. */
/** The week's plaza fountain: 0 dry, 1 trickling (half the week's targets done), 2 flowing (full week). */
export function drawBigFountain(r: Renderer, bx: number, by: number, stage: 0 | 1 | 2) {
  const cx = bx + 1.5, cy = by + 1.5;
  if (stage === 0) {
    r.box(cx - 0.4, cy - 0.4, 0, 0.8, 0.8, 0.16, '#a9a3b8');
    r.box(cx - 0.25, cy - 0.25, 0.16, 0.5, 0.5, 0.1, '#c9c3d6');
    r.commit();
    return;
  }
  if (stage === 1) {
    // A smaller basin with a little water and a short spout.
    r.box(cx - 0.75, cy - 0.75, 0, 1.5, 1.5, 0.18, '#b9b3c8');
    const w = r.tones('#5fb8e8');
    fillPoly(r.obj, [r.P(cx - 0.6, cy - 0.6, 0.14), r.P(cx + 0.6, cy - 0.6, 0.14), r.P(cx + 0.6, cy + 0.6, 0.14), r.P(cx - 0.6, cy + 0.6, 0.14)], (x, y) => (hash(x, y) < 40 ? w[0] : w[2]));
    r.box(cx - 0.14, cy - 0.14, 0.14, 0.28, 0.28, 0.42, '#e4e0ee');
    r.box(cx - 0.2, cy - 0.2, 0.56, 0.4, 0.4, 0.06, '#d4b03a');
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      r.dot(cx + Math.cos(a) * 0.28, cy + Math.sin(a) * 0.28, 0.5 - (i % 2) * 0.12, '#bfe8ff');
    }
    r.commit();
    return;
  }
  r.box(bx + 0.4, by + 0.4, 0, 2.2, 2.2, 0.2, '#c9c3d6');
  const t = r.tones('#5fb8e8');
  fillPoly(r.obj, [r.P(bx + 0.55, by + 0.55, 0.2), r.P(bx + 2.45, by + 0.55, 0.2), r.P(bx + 2.45, by + 2.45, 0.2), r.P(bx + 0.55, by + 2.45, 0.2)], (x, y) => (hash(x, y) < 50 ? t[0] : t[2]));
  r.box(cx - 0.18, cy - 0.18, 0.2, 0.36, 0.36, 0.5, '#e4e0ee');
  r.box(cx - 0.4, cy - 0.4, 0.7, 0.8, 0.8, 0.08, '#e4e0ee');
  r.box(cx - 0.1, cy - 0.1, 0.78, 0.2, 0.2, 0.3, '#e4e0ee');
  r.box(cx - 0.22, cy - 0.22, 1.08, 0.44, 0.44, 0.06, '#d4b03a');
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    r.dot(cx + Math.cos(a) * 0.45, cy + Math.sin(a) * 0.45, 0.9 - (i % 3) * 0.08, '#bfe8ff');
  }
  r.dot(cx, cy, 1.32, '#bfe8ff', 3);
  r.commit();
}
