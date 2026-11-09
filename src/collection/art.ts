// Critter art: 20 base shapes built from shaded boxes, patterns, epic effects,
// legendary crowns, pedestals, and the animation frames for legendaries and mythics.
import { hex, pack, type Renderer, type Rendered } from '../iso/engine';

export type Mark = 'none' | 'spots' | 'stripes' | 'patch' | 'socks';
export type Fx = 'none' | 'cosmic' | 'magma' | 'spectral' | 'thorn' | 'glacier' | 'neon';

export interface Look {
  name: string;
  body: string;
  accent: string;
  detail: string;
  mark?: Mark;
  markColor?: string;
  fx?: Fx;
}

const EYE = '#2b2340';

/** Draws a pattern over the visible faces of a box. */
function marks(r: Renderer, x0: number, y0: number, z0: number, sx: number, sy: number, sz: number, look: Look) {
  const c = look.markColor ?? look.accent;
  const x1 = x0 + sx, y1 = y0 + sy, z1 = z0 + sz;
  switch (look.mark) {
    case 'spots':
      for (const [fx, fz] of [[0.2, 0.55], [0.6, 0.3], [0.75, 0.7]]) r.faceL(y1, x0 + sx * fx, x0 + sx * fx + 0.05, z0 + sz * fz, z0 + sz * fz + 0.05, c);
      for (const [fy, fz] of [[0.3, 0.5], [0.7, 0.65]]) r.faceR(x1, y0 + sy * fy, y0 + sy * fy + 0.05, z0 + sz * fz, z0 + sz * fz + 0.05, c);
      r.dot(x0 + sx * 0.3, y0 + sy * 0.4, z1, c, 2);
      r.dot(x0 + sx * 0.7, y0 + sy * 0.6, z1, c, 2);
      break;
    case 'stripes':
      for (const f of [0.2, 0.5, 0.8]) r.faceR(x1, y0 + sy * f - 0.02, y0 + sy * f + 0.02, z0 + sz * 0.3, z1, c);
      for (const f of [0.3, 0.7]) r.faceL(y1, x0 + sx * f - 0.02, x0 + sx * f + 0.02, z0 + sz * 0.4, z1, c);
      break;
    case 'patch':
      r.faceL(y1, x0, x0 + sx * 0.5, z0 + sz * 0.3, z1, c);
      r.faceR(x1, y0 + sy * 0.5, y1, z0, z1, c);
      break;
  }
}

// ---------- Four-legged critters ----------
interface Quad {
  bodyW: number;
  bodyL: number;
  bodyH: number;
  legH: number;
  headW: number;
  headL: number;
  headH: number;
  /** Extra features, given the head's box and the body's back end. */
  extras: (r: Renderer, h: { x0: number; y0: number; z0: number; w: number; l: number; z1: number }, b: { x0: number; y0: number; z0: number; z1: number }, look: Look) => void;
}

function quad(q: Quad) {
  return (r: Renderer, gx: number, gy: number, look: Look) => {
    const bx0 = gx + 0.5 - q.bodyW / 2, by0 = gy + 0.22, bz0 = q.legH;
    r.shadow(bx0 - 0.04, by0, q.bodyW + 0.08, q.bodyL + q.headL, 0.5);
    const leg = look.mark === 'socks' ? (look.markColor ?? look.accent) : look.body;
    if (q.legH > 0)
      for (const [dx, dy] of [[0.02, 0.02], [q.bodyW - 0.08, 0.02], [0.02, q.bodyL - 0.08], [q.bodyW - 0.08, q.bodyL - 0.08]]) r.box(bx0 + dx, by0 + dy, 0, 0.06, 0.06, q.legH, leg);
    r.box(bx0, by0, bz0, q.bodyW, q.bodyL, q.bodyH, look.body);
    marks(r, bx0, by0, bz0, q.bodyW, q.bodyL, q.bodyH, look);
    const h = { x0: gx + 0.5 - q.headW / 2, y0: by0 + q.bodyL - 0.06, z0: bz0 + q.bodyH * 0.45, w: q.headW, l: q.headL, z1: bz0 + q.bodyH * 0.45 + q.headH };
    r.box(h.x0, h.y0, h.z0, h.w, h.l, q.headH, look.body);
    const ez = h.z0 + q.headH * 0.5, ey = h.y0 + h.l;
    r.faceL(ey, h.x0 + h.w * 0.18, h.x0 + h.w * 0.18 + 0.05, ez, ez + 0.06, EYE);
    r.faceL(ey, h.x0 + h.w * 0.66, h.x0 + h.w * 0.66 + 0.05, ez, ez + 0.06, EYE);
    q.extras(r, h, { x0: bx0, y0: by0, z0: bz0, z1: bz0 + q.bodyH }, look);
  };
}

// ---------- Birds and others ----------
function bird(o: { w: number; h: number; beak: 'short' | 'wide'; extras?: (r: Renderer, gx: number, gy: number, top: number, look: Look) => void }) {
  return (r: Renderer, gx: number, gy: number, look: Look) => {
    const x0 = gx + 0.5 - o.w / 2, y0 = gy + 0.34;
    r.shadow(x0, y0, o.w, o.w, 0.6);
    r.box(x0 + 0.06, y0 + 0.08, 0, 0.05, 0.05, 0.06, look.accent);
    r.box(x0 + o.w - 0.11, y0 + 0.08, 0, 0.05, 0.05, 0.06, look.accent);
    r.box(x0, y0, 0.06, o.w, o.w * 0.9, o.h, look.body);
    marks(r, x0, y0, 0.06, o.w, o.w * 0.9, o.h, look);
    r.faceL(y0 + o.w * 0.9, x0 + o.w * 0.25, x0 + o.w * 0.75, 0.1, 0.06 + o.h * 0.55, look.detail);
    const top = 0.06 + o.h;
    const by = y0 + o.w * 0.9;
    if (o.beak === 'wide') r.box(x0 + o.w * 0.25, by, top - 0.16, o.w * 0.5, 0.08, 0.05, look.accent);
    else r.box(x0 + o.w * 0.4, by, top - 0.16, o.w * 0.2, 0.06, 0.06, look.accent);
    r.faceL(by, x0 + o.w * 0.22, x0 + o.w * 0.22 + 0.05, top - 0.1, top - 0.04, EYE);
    r.faceL(by, x0 + o.w * 0.68, x0 + o.w * 0.68 + 0.05, top - 0.1, top - 0.04, EYE);
    r.box(x0 - 0.04, y0 + 0.12, 0.14, 0.04, o.w * 0.5, o.h * 0.45, look.detail === look.body ? look.accent : look.body);
    o.extras?.(r, gx, gy, top, look);
  };
}

export type Shape = (r: Renderer, gx: number, gy: number, look: Look) => void;

export const SHAPES: Record<string, Shape> = {
  cat: quad({ bodyW: 0.26, bodyL: 0.34, bodyH: 0.18, legH: 0.1, headW: 0.28, headL: 0.22, headH: 0.22,
    extras: (r, h, b, l) => {
      r.pyramid(h.x0, h.y0 + 0.06, h.x0 + 0.1, h.y0 + 0.16, h.z1, 0.14, l.body);
      r.pyramid(h.x0 + h.w - 0.1, h.y0 + 0.06, h.x0 + h.w, h.y0 + 0.16, h.z1, 0.14, l.body);
      r.box(b.x0 + 0.1, b.y0 - 0.04, b.z1 - 0.04, 0.05, 0.05, 0.24, l.accent);
      r.box(b.x0 + 0.1, b.y0 - 0.12, b.z1 + 0.16, 0.05, 0.12, 0.05, l.accent);
    } }),
  dog: quad({ bodyW: 0.3, bodyL: 0.34, bodyH: 0.2, legH: 0.1, headW: 0.28, headL: 0.22, headH: 0.22,
    extras: (r, h, b, l) => {
      r.box(h.x0 - 0.05, h.y0 + 0.06, h.z0 + 0.02, 0.05, 0.12, 0.18, l.accent);
      r.box(h.x0 + h.w, h.y0 + 0.06, h.z0 + 0.02, 0.05, 0.12, 0.18, l.accent);
      r.box(h.x0 + 0.07, h.y0 + h.l, h.z0, 0.14, 0.1, 0.1, l.detail);
      r.box(h.x0 + 0.11, h.y0 + h.l + 0.08, h.z0 + 0.07, 0.06, 0.03, 0.04, EYE);
      r.box(b.x0 + 0.12, b.y0 - 0.06, b.z1 - 0.02, 0.06, 0.06, 0.16, l.body);
    } }),
  fox: quad({ bodyW: 0.24, bodyL: 0.3, bodyH: 0.17, legH: 0.1, headW: 0.26, headL: 0.22, headH: 0.2,
    extras: (r, h, b, l) => {
      // A huge bushy tail sweeping up behind.
      r.box(b.x0 + 0.03, b.y0 - 0.2, b.z0 + 0.02, 0.18, 0.22, 0.22, l.body);
      r.box(b.x0 + 0.03, b.y0 - 0.2, b.z0 + 0.24, 0.18, 0.12, 0.08, l.detail);
      r.pyramid(h.x0 - 0.01, h.y0 + 0.05, h.x0 + 0.11, h.y0 + 0.17, h.z1, 0.17, l.body);
      r.pyramid(h.x0 + h.w - 0.11, h.y0 + 0.05, h.x0 + h.w + 0.01, h.y0 + 0.17, h.z1, 0.17, l.body);
      r.box(h.x0 + 0.08, h.y0 + h.l, h.z0, 0.1, 0.1, 0.08, l.detail);
      r.box(h.x0 + 0.11, h.y0 + h.l + 0.08, h.z0 + 0.06, 0.04, 0.03, 0.03, EYE);
    } }),
  bunny: quad({ bodyW: 0.26, bodyL: 0.26, bodyH: 0.22, legH: 0.04, headW: 0.24, headL: 0.2, headH: 0.2,
    extras: (r, h, b, l) => {
      r.box(h.x0 + 0.03, h.y0 + 0.07, h.z1, 0.06, 0.05, 0.3, l.body);
      r.box(h.x0 + h.w - 0.09, h.y0 + 0.07, h.z1, 0.06, 0.05, 0.3, l.body);
      r.faceL(h.y0 + 0.12, h.x0 + 0.045, h.x0 + 0.075, h.z1 + 0.04, h.z1 + 0.26, l.accent);
      r.faceL(h.y0 + 0.12, h.x0 + h.w - 0.075, h.x0 + h.w - 0.045, h.z1 + 0.04, h.z1 + 0.26, l.accent);
      r.box(b.x0 + 0.08, b.y0 - 0.06, b.z0 + 0.08, 0.1, 0.08, 0.1, l.detail);
    } }),
  mouse: quad({ bodyW: 0.2, bodyL: 0.26, bodyH: 0.14, legH: 0.04, headW: 0.2, headL: 0.18, headH: 0.15,
    extras: (r, h, b, l) => {
      // Big round ears and a long thin tail.
      r.box(h.x0 - 0.08, h.y0 + 0.08, h.z1 - 0.04, 0.12, 0.04, 0.14, l.accent);
      r.box(h.x0 + h.w - 0.04, h.y0 + 0.08, h.z1 - 0.04, 0.12, 0.04, 0.14, l.accent);
      r.box(h.x0 + 0.08, h.y0 + h.l, h.z0 + 0.03, 0.04, 0.04, 0.04, l.accent);
      r.box(b.x0 + 0.08, b.y0 - 0.26, b.z0 + 0.02, 0.03, 0.26, 0.03, l.accent);
    } }),
  bear: quad({ bodyW: 0.38, bodyL: 0.36, bodyH: 0.26, legH: 0.08, headW: 0.3, headL: 0.22, headH: 0.24,
    extras: (r, h, _b, l) => {
      r.box(h.x0 - 0.02, h.y0 + 0.08, h.z1 - 0.02, 0.09, 0.06, 0.08, l.body);
      r.box(h.x0 + h.w - 0.07, h.y0 + 0.08, h.z1 - 0.02, 0.09, 0.06, 0.08, l.body);
      r.box(h.x0 + 0.09, h.y0 + h.l, h.z0 + 0.02, 0.12, 0.06, 0.08, l.detail);
      r.box(h.x0 + 0.13, h.y0 + h.l + 0.04, h.z0 + 0.07, 0.04, 0.03, 0.03, EYE);
    } }),
  pig: quad({ bodyW: 0.32, bodyL: 0.32, bodyH: 0.2, legH: 0.06, headW: 0.28, headL: 0.2, headH: 0.2,
    extras: (r, h, b, l) => {
      // A flat wide snout with nostrils, little ears and a curly tail.
      r.box(h.x0 + 0.06, h.y0 + h.l, h.z0 + 0.02, 0.16, 0.06, 0.1, l.accent);
      r.faceL(h.y0 + h.l + 0.06, h.x0 + 0.09, h.x0 + 0.12, h.z0 + 0.05, h.z0 + 0.08, EYE);
      r.faceL(h.y0 + h.l + 0.06, h.x0 + 0.16, h.x0 + 0.19, h.z0 + 0.05, h.z0 + 0.08, EYE);
      r.pyramid(h.x0 + 0.01, h.y0 + 0.04, h.x0 + 0.09, h.y0 + 0.12, h.z1, 0.07, l.accent);
      r.pyramid(h.x0 + h.w - 0.09, h.y0 + 0.04, h.x0 + h.w - 0.01, h.y0 + 0.12, h.z1, 0.07, l.accent);
      r.box(b.x0 + 0.13, b.y0 - 0.06, b.z1 - 0.06, 0.06, 0.06, 0.04, l.accent);
      r.box(b.x0 + 0.13, b.y0 - 0.06, b.z1 - 0.02, 0.03, 0.03, 0.06, l.accent);
    } }),
  deer: quad({ bodyW: 0.22, bodyL: 0.3, bodyH: 0.16, legH: 0.22, headW: 0.2, headL: 0.18, headH: 0.18,
    extras: (r, h, _b, l) => {
      r.box(h.x0 - 0.06, h.y0 + 0.06, h.z1 - 0.06, 0.07, 0.04, 0.05, l.body);
      r.box(h.x0 + h.w - 0.01, h.y0 + 0.06, h.z1 - 0.06, 0.07, 0.04, 0.05, l.body);
      r.box(h.x0 + 0.06, h.y0 + h.l, h.z0 + 0.02, 0.08, 0.06, 0.06, l.detail);
    } }),
};

// Non-quad shapes.
SHAPES.sheep = (r, gx, gy, l) => {
  r.shadow(gx + 0.24, gy + 0.24, 0.52, 0.52, 0.5);
  for (const [dx, dy] of [[0.34, 0.32], [0.56, 0.32], [0.34, 0.54], [0.56, 0.54]]) r.box(gx + dx, gy + dy, 0, 0.06, 0.06, 0.1, l.accent);
  r.box(gx + 0.28, gy + 0.28, 0.1, 0.44, 0.36, 0.22, l.body);
  // Woolly bumps on top.
  for (const [dx, dy] of [[0.3, 0.3], [0.52, 0.3], [0.3, 0.46], [0.52, 0.46]]) r.box(gx + dx, gy + dy, 0.32, 0.16, 0.14, 0.06, l.body);
  r.box(gx + 0.39, gy + 0.6, 0.16, 0.22, 0.18, 0.2, l.accent);
  r.box(gx + 0.33, gy + 0.66, 0.26, 0.06, 0.06, 0.04, l.accent);
  r.box(gx + 0.61, gy + 0.66, 0.26, 0.06, 0.06, 0.04, l.accent);
  r.faceL(gy + 0.78, gx + 0.43, gx + 0.47, 0.26, 0.31, '#fff8e7');
  r.faceL(gy + 0.78, gx + 0.53, gx + 0.57, 0.26, 0.31, '#fff8e7');
};
SHAPES.hedgehog = (r, gx, gy, l) => {
  r.shadow(gx + 0.26, gy + 0.26, 0.48, 0.48, 0.4);
  r.box(gx + 0.38, gy + 0.62, 0, 0.22, 0.16, 0.14, l.accent);
  r.box(gx + 0.45, gy + 0.78, 0.04, 0.06, 0.04, 0.05, EYE);
  r.faceL(gy + 0.78, gx + 0.4, gx + 0.44, 0.08, 0.12, EYE);
  r.faceL(gy + 0.78, gx + 0.54, gx + 0.58, 0.08, 0.12, EYE);
  r.pyramid(gx + 0.26, gy + 0.24, gx + 0.7, gy + 0.68, 0, 0.36, l.body);
  for (const [dx, dy, dz] of [[0.36, 0.36, 0.2], [0.56, 0.38, 0.18], [0.44, 0.52, 0.22], [0.6, 0.56, 0.12], [0.34, 0.58, 0.1]]) r.dot(gx + dx, gy + dy, dz, l.detail, 2);
};
SHAPES.chick = bird({ w: 0.26, h: 0.24, beak: 'short' });
SHAPES.duck = bird({ w: 0.28, h: 0.26, beak: 'wide', extras: (r, gx, gy, _t, l) => r.box(gx + 0.46, gy + 0.3, 0.2, 0.08, 0.06, 0.1, l.body) });
SHAPES.owl = bird({ w: 0.34, h: 0.36, beak: 'short', extras: (r, gx, gy, top, l) => {
  r.pyramid(gx + 0.34, gy + 0.36, gx + 0.42, gy + 0.44, top, 0.12, l.body);
  r.pyramid(gx + 0.58, gy + 0.36, gx + 0.66, gy + 0.44, top, 0.12, l.body);
  // Big round eyes.
  r.faceL(gy + 0.646, gx + 0.36, gx + 0.47, top - 0.16, top - 0.04, '#fff8e7');
  r.faceL(gy + 0.646, gx + 0.53, gx + 0.64, top - 0.16, top - 0.04, '#fff8e7');
  r.faceL(gy + 0.647, gx + 0.4, gx + 0.44, top - 0.12, top - 0.07, EYE);
  r.faceL(gy + 0.647, gx + 0.57, gx + 0.61, top - 0.12, top - 0.07, EYE);
} });
SHAPES.penguin = bird({ w: 0.3, h: 0.46, beak: 'short' });
SHAPES.frog = (r, gx, gy, l) => {
  r.shadow(gx + 0.22, gy + 0.3, 0.56, 0.42, 0.3);
  r.box(gx + 0.24, gy + 0.56, 0, 0.1, 0.12, 0.06, l.body);
  r.box(gx + 0.66, gy + 0.56, 0, 0.1, 0.12, 0.06, l.body);
  r.box(gx + 0.28, gy + 0.32, 0, 0.44, 0.38, 0.16, l.body);
  marks(r, gx + 0.28, gy + 0.32, 0, 0.44, 0.38, 0.16, l);
  r.faceL(gy + 0.7, gx + 0.32, gx + 0.68, 0.03, 0.08, l.detail);
  r.faceL(gy + 0.7, gx + 0.32, gx + 0.68, 0.075, 0.09, EYE);
  for (const dx of [0.3, 0.58]) {
    r.box(gx + dx, gy + 0.56, 0.16, 0.12, 0.12, 0.1, l.body);
    r.faceL(gy + 0.68, gx + dx + 0.03, gx + dx + 0.09, 0.19, 0.25, '#fff8e7');
    r.faceL(gy + 0.681, gx + dx + 0.05, gx + dx + 0.08, 0.2, 0.24, EYE);
  }
};
SHAPES.turtle = (r, gx, gy, l) => {
  r.shadow(gx + 0.22, gy + 0.22, 0.56, 0.56, 0.4);
  for (const [dx, dy] of [[0.28, 0.3], [0.62, 0.3], [0.28, 0.6], [0.62, 0.6]]) r.box(gx + dx, gy + dy, 0, 0.08, 0.08, 0.06, l.accent);
  r.box(gx + 0.42, gy + 0.68, 0.02, 0.16, 0.16, 0.12, l.accent);
  r.faceL(gy + 0.84, gx + 0.45, gx + 0.49, 0.08, 0.12, EYE);
  r.faceL(gy + 0.84, gx + 0.53, gx + 0.57, 0.08, 0.12, EYE);
  r.box(gx + 0.26, gy + 0.26, 0.04, 0.48, 0.46, 0.08, l.detail);
  r.pyramid(gx + 0.26, gy + 0.26, gx + 0.74, gy + 0.72, 0.12, 0.24, l.body);
  for (const [dx, dy, dz] of [[0.42, 0.4, 0.22], [0.56, 0.5, 0.2], [0.4, 0.58, 0.16]]) r.dot(gx + dx, gy + dy, dz, l.detail, 3);
};
SHAPES.snail = (r, gx, gy, l) => {
  r.shadow(gx + 0.3, gy + 0.24, 0.4, 0.52, 0.5);
  r.box(gx + 0.42, gy + 0.24, 0, 0.16, 0.54, 0.06, l.accent);
  r.box(gx + 0.44, gy + 0.68, 0.06, 0.12, 0.08, 0.14, l.accent);
  for (const dx of [0.45, 0.53]) {
    r.box(gx + dx, gy + 0.74, 0.2, 0.02, 0.02, 0.1, l.accent);
    r.dot(gx + dx, gy + 0.75, 0.31, EYE, 2);
  }
  // A tall spiral shell.
  r.box(gx + 0.32, gy + 0.28, 0.06, 0.36, 0.34, 0.32, l.body);
  r.faceL(gy + 0.62, gx + 0.38, gx + 0.58, 0.12, 0.32, l.detail);
  r.faceL(gy + 0.62, gx + 0.43, gx + 0.53, 0.17, 0.27, l.body);
  r.faceL(gy + 0.62, gx + 0.46, gx + 0.5, 0.2, 0.24, l.detail);
};
SHAPES.crab = (r, gx, gy, l) => {
  r.shadow(gx + 0.2, gy + 0.3, 0.6, 0.4, 0.3);
  for (const dx of [0.24, 0.32, 0.62, 0.7]) r.box(gx + dx, gy + 0.4, 0, 0.04, 0.2, 0.04, l.body);
  r.box(gx + 0.3, gy + 0.36, 0.04, 0.4, 0.28, 0.14, l.body);
  marks(r, gx + 0.3, gy + 0.36, 0.04, 0.4, 0.28, 0.14, l);
  // Big raised claws.
  for (const dx of [0.16, 0.72]) {
    r.box(gx + dx, gy + 0.6, 0.1, 0.12, 0.12, 0.16, l.body);
    r.box(gx + dx + 0.02, gy + 0.62, 0.26, 0.04, 0.08, 0.06, l.accent);
  }
  for (const dx of [0.42, 0.56]) {
    r.box(gx + dx, gy + 0.58, 0.18, 0.03, 0.03, 0.1, l.body);
    r.dot(gx + dx, gy + 0.59, 0.3, EYE, 2);
  }
};
SHAPES.slime = (r, gx, gy, l) => {
  r.shadow(gx + 0.22, gy + 0.22, 0.56, 0.56, 0.4);
  for (const [dx, dy] of [[0.26, 0.66], [0.62, 0.68], [0.7, 0.4]]) r.box(gx + dx, gy + dy, 0, 0.08, 0.06, 0.04, l.body);
  r.box(gx + 0.26, gy + 0.28, 0, 0.48, 0.46, 0.18, l.body);
  r.box(gx + 0.32, gy + 0.34, 0.18, 0.36, 0.34, 0.12, l.body);
  r.box(gx + 0.4, gy + 0.42, 0.3, 0.2, 0.2, 0.06, l.body);
  r.faceL(gy + 0.74, gx + 0.38, gx + 0.43, 0.1, 0.18, EYE);
  r.faceL(gy + 0.74, gx + 0.56, gx + 0.61, 0.1, 0.18, EYE);
  r.faceL(gy + 0.68, gx + 0.36, gx + 0.42, 0.22, 0.26, l.detail);
};
SHAPES.axolotl = quad({ bodyW: 0.22, bodyL: 0.34, bodyH: 0.12, legH: 0.04, headW: 0.28, headL: 0.18, headH: 0.16,
  extras: (r, h, b, l) => {
    // Frilly gills fanning out on both sides.
    for (const [dz, len] of [[0.02, 0.12], [0.08, 0.14], [0.14, 0.1]]) {
      r.box(h.x0 - len + 0.02, h.y0 + 0.06, h.z0 + dz + 0.02, len, 0.04, 0.03, l.accent);
      r.box(h.x0 + h.w - 0.02, h.y0 + 0.06, h.z0 + dz + 0.02, len, 0.04, 0.03, l.accent);
    }
    r.box(b.x0 + 0.08, b.y0 - 0.16, b.z0, 0.06, 0.18, 0.1, l.body);
    r.faceL(h.y0 + h.l, h.x0 + 0.08, h.x0 + 0.2, h.z0 + 0.03, h.z0 + 0.04, EYE);
  } });

// ---------- Epic effects ----------

/** Little effects around an epic critter's element. Legendaries keep them too. */
export function drawFx(r: Renderer, fx: Fx, gx: number, gy: number) {
  if (fx === 'none') return;
  const dot = (x: number, y: number, z: number, c: string, s = 2) => r.dot(gx + x, gy + y, z, c, s);
  switch (fx) {
    case 'cosmic':
      for (const [x, y, z, c] of [[0.16, 0.42, 0.62, '#ffffff'], [0.84, 0.36, 0.5, '#fff2a8'], [0.3, 0.86, 0.7, '#bfe8ff'], [0.82, 0.8, 0.32, '#ffffff'], [0.5, 0.12, 0.74, '#fff2a8']] as const) dot(x, y, z, c);
      break;
    case 'magma':
      for (const [x, y, z, c] of [[0.2, 0.4, 0.48, '#ff6a2a'], [0.8, 0.44, 0.58, '#ffb03a'], [0.34, 0.84, 0.36, '#ff6a2a'], [0.74, 0.78, 0.7, '#4a3a3a']] as const) dot(x, y, z, c, 3);
      r.box(gx + 0.14, gy + 0.68, 0, 0.1, 0.1, 0.03, '#ff6a2a');
      break;
    case 'spectral':
      for (const [x, y, z] of [[0.16, 0.5, 0.3], [0.84, 0.42, 0.45], [0.5, 0.14, 0.55]]) {
        const a = r.P(gx + x, gy + y, z), b = r.P(gx + x, gy + y, z + 0.22);
        for (let i = 0; i <= 8; i++) r.obj.set(a[0] + (i % 3 === 0 ? 1 : 0), Math.round(a[1] + (b[1] - a[1]) * (i / 8)), r.tones('#bff4ec')[1]);
      }
      break;
    case 'thorn':
      r.pyramid(gx + 0.1, gy + 0.62, gx + 0.18, gy + 0.7, 0, 0.16, '#3f6a2a');
      r.pyramid(gx + 0.8, gy + 0.24, gx + 0.88, gy + 0.32, 0, 0.12, '#3f6a2a');
      dot(0.2, 0.36, 0.5, '#9ad050');
      dot(0.82, 0.74, 0.4, '#e85d5d');
      break;
    case 'glacier':
      r.pyramid(gx + 0.12, gy + 0.6, gx + 0.2, gy + 0.68, 0, 0.2, '#cfeeff');
      r.pyramid(gx + 0.8, gy + 0.22, gx + 0.88, gy + 0.3, 0, 0.16, '#a8dcf8');
      for (const [x, y, z] of [[0.3, 0.84, 0.6], [0.84, 0.6, 0.66], [0.2, 0.3, 0.7]]) dot(x, y, z, '#ffffff');
      break;
    case 'neon':
      for (const [x, y, z, c] of [[0.16, 0.42, 0.4, '#ff4ad0'], [0.84, 0.4, 0.5, '#3ae8ff'], [0.32, 0.86, 0.3, '#3ae8ff'], [0.78, 0.8, 0.62, '#ff4ad0']] as const) {
        const a = r.P(gx + x, gy + y, z);
        for (let i = -2; i <= 2; i++) r.obj.set(a[0] + i, a[1] + (i % 2), r.tones(c)[1]);
      }
      break;
  }
  r.commit();
}

// ---------- Crowns and pedestals ----------

const CROWN = ['.g.g.g.', '.ggggg.', 'gggjggg', 'ddddddd'];

/** A tiny crown above whatever is currently drawn in the object layer (call before commit). */
export function drawCrown(r: Renderer, jewel: string) {
  const { obj } = r;
  if (obj.x1 < 0) return;
  const gold = pack(hex('#f7d24a')), dark = pack(hex('#a07a10')), gem = pack(hex(jewel));
  const cx = Math.round((obj.x0 + obj.x1) / 2) - 3, cy = obj.y0 - 6;
  CROWN.forEach((row, ry) => [...row].forEach((ch, rx) => ch !== '.' && obj.set(cx + rx, cy + ry, ch === 'j' ? gem : ch === 'd' ? dark : gold)));
}

/** A gold pedestal for legendaries, a crystal one for mythics. */
export function drawPedestal(r: Renderer, gx: number, gy: number, kind: 'gold' | 'crystal') {
  if (kind === 'gold') {
    r.box(gx + 0.16, gy + 0.16, 0, 0.68, 0.68, 0.08, '#d4a020');
    r.box(gx + 0.2, gy + 0.2, 0.08, 0.6, 0.6, 0.03, '#fff2a8');
  } else {
    r.box(gx + 0.14, gy + 0.14, 0, 0.72, 0.72, 0.06, '#8ac8e8');
    r.box(gx + 0.18, gy + 0.18, 0.06, 0.64, 0.64, 0.05, '#d6f4ff');
    for (const [x, y] of [[0.16, 0.5], [0.5, 0.16], [0.84, 0.5]]) r.pyramid(gx + x - 0.04, gy + y - 0.04, gx + x + 0.04, gy + y + 0.04, 0.06, 0.12, '#bfe8ff');
  }
  r.commit();
}

// ---------- Animation frames ----------

export interface AnimLayers {
  base: Rendered;
  ground: Rendered;
}

const RAINBOW = ['#ff7ad9', '#ffb03a', '#fff2a8', '#7cf0a0', '#7ae8ff', '#b07aff'];

/**
 * One frame of a legendary or mythic critter. The critter's pixels carry obj id 1.
 * Legendary: gentle bob, a shine band across the gold, twinkles.
 * Mythic: hovers higher, a color-shifting glow outline, an orbiting rainbow aura, shine and twinkles.
 */
export function animFrame(l: AnimLayers, t: number, kind: 'legendary' | 'mythic'): Rendered {
  const { base, ground } = l;
  const w = base.width, h = base.height;
  const out = base.pixels.slice();
  const ids = base.objIds;
  const mythic = kind === 'mythic';
  const lift = mythic ? 4 + Math.round((Math.sin(t * Math.PI * 2) + 1) * 1.5) : Math.round((Math.sin(t * Math.PI * 2) + 1) * 1.5);
  for (let i = 0; i < out.length; i++) if (ids[i] === 1) out[i] = ground.pixels[i];
  const band = ((t * 1.6) % 1.6) * (w + h) - h * 0.4;
  const moved = new Uint8Array(w * h);
  let x0 = w, x1 = 0, y0 = h, y1 = 0;
  for (let i = 0; i < out.length; i++) {
    if (ids[i] !== 1) continue;
    const x = i % w, y = (i - x) / w, ny = y - lift;
    if (ny < 0) continue;
    let v = base.pixels[i];
    const d = x + y - band;
    if (d > 0 && d < 5) {
      const r = v & 255, g = (v >> 8) & 255, b = (v >> 16) & 255;
      v = ((255 << 24) | (Math.min(255, b + 90) << 16) | (Math.min(255, g + 70) << 8) | Math.min(255, r + 60)) >>> 0;
    }
    out[ny * w + x] = v;
    moved[ny * w + x] = 1;
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, ny);
    y1 = Math.max(y1, ny);
  }
  const set = (x: number, y: number, c: number) => {
    if (x >= 0 && y >= 0 && x < w && y < h) out[Math.round(y) * w + Math.round(x)] = c;
  };
  if (mythic) {
    // A glow outline whose color shifts through the rainbow.
    const glow = pack(hex(RAINBOW[Math.floor(t * RAINBOW.length * 2) % RAINBOW.length]));
    for (let y = Math.max(0, y0 - 1); y <= Math.min(h - 1, y1 + 1); y++)
      for (let x = Math.max(0, x0 - 1); x <= Math.min(w - 1, x1 + 1); x++) {
        if (moved[y * w + x]) continue;
        if (moved[y * w + x - 1] || moved[y * w + x + 1] || (y > 0 && moved[(y - 1) * w + x]) || (y < h - 1 && moved[(y + 1) * w + x])) out[y * w + x] = glow;
      }
    // Six aura specks orbiting the critter.
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2 + 6, ry = (y1 - y0) / 2 + 4;
    for (let k = 0; k < 6; k++) {
      const a = t * Math.PI * 2 + (k * Math.PI) / 3;
      const c = pack(hex(RAINBOW[k]));
      const px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry * 0.7;
      set(px, py, c);
      set(px + 1, py, c);
      set(px, py + 1, c);
      set(px + 1, py + 1, c);
    }
  }
  // Twinkling sparkles.
  const spots = [[x0 - 4, y0 + 4], [x1 + 3, y0 + 8], [x0 + 2, y0 + 20], [x1 - 2, y0 - 2], [x0 - 2, y0 + 14]];
  spots.forEach(([sx, sy], i) => {
    const phase = (t * 3 + i * 0.37) % 1;
    if (phase > 0.5) return;
    const s = phase < 0.25 ? 1 : 2;
    for (const [dx, dy] of [[0, 0], [s, 0], [-s, 0], [0, s], [0, -s]]) set(sx + dx, sy + dy, 0xffffffff);
  });
  return { ...base, pixels: out };
}
