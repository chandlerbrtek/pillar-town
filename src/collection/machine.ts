// The isometric capsule machine, drawn with the town's renderer.
import { fillPoly, line, Renderer, type Pt } from '../iso/engine';
import { paint } from '../iso/scenes';

const TW = 64, MW = 4 * (TW / 2) + 16, MH = Math.round(4 * (TW / 4) + 5 * (TW / 2) + 16);

export interface Drop {
  x: number;
  y: number;
  z: number;
  color: string;
  tilt: number;
  open?: number;
}
export interface MachineState {
  crank: number;
  jiggle: number;
  drop?: Drop;
  glow?: { color: string; amount: number };
  flash?: { color: string; alpha: number };
  burst?: { color: string; t: number };
}

const DOME: [number, number, number, string][] = [
  [0.72, 0.72, 1.0, '#5aa7f0'], [1.0, 0.7, 1.0, '#e85d5d'], [1.28, 0.74, 1.0, '#7cc35c'], [0.7, 1.0, 1.0, '#f7d24a'],
  [1.0, 1.0, 1.0, '#b06ff0'], [1.3, 1.02, 1.0, '#ff9ad0'], [0.74, 1.28, 1.0, '#cfd8c8'], [1.02, 1.3, 1.0, '#e8913a'],
  [1.3, 1.3, 1.0, '#5aa7f0'], [0.86, 0.86, 1.24, '#7cc35c'], [1.14, 0.88, 1.24, '#f2c13a'], [0.88, 1.14, 1.24, '#e85d5d'],
  [1.16, 1.16, 1.24, '#b06ff0'], [1.0, 1.0, 1.46, '#5aa7f0'],
];

/** A two-tone capsule centered at a screen point. */
function capsuleAt(r: Renderer, cx: number, cy: number, rad: number, top: string, tilt = 0, open?: number) {
  const t = r.tones(top);
  const half = (sx: number, sy: number, upper: boolean) => {
    for (let y = -rad; y <= rad; y++)
      for (let x = -rad; x <= rad; x++) {
        if (x * x + y * y > rad * rad) continue;
        const seam = y + x * tilt;
        if (upper ? seam > 0 : seam <= 0) continue;
        let c: number;
        if (Math.abs(seam) < 0.7) c = t[4];
        else if (upper) c = x < -rad * 0.3 && y < -rad * 0.3 ? t[0] : x > rad * 0.3 ? t[3] : t[2];
        else c = x > rad * 0.3 ? r.tones('#e4e0ee')[3] : r.tones('#f4f0fa')[1];
        r.obj.set(Math.round(sx + x), Math.round(sy + y), c);
      }
  };
  if (open === undefined) {
    half(cx, cy, true);
    half(cx, cy, false);
  } else {
    half(cx - open * 6, cy - open * 9, true);
    half(cx + open * 5, cy + open * 3, false);
  }
}

let cropBox: { x: number; y: number; w: number; h: number } | null = null;

/** Draws the machine (and a capsule, glow, burst or flash) onto a canvas. */
export function renderMachine(canvas: HTMLCanvasElement, s: MachineState) {
  const r = new Renderer(TW, MW, MH, 2 * (TW / 2) + 8, Math.round(2.5 * (TW / 2) + 8));
  // Floating stone platform.
  const rock = r.tones('#6a6a78');
  fillPoly(r.obj, [r.P(0, 2, -0.3), r.P(2, 2, -0.3), r.P(1.1, 1.1, -1.4)], rock[2]);
  fillPoly(r.obj, [r.P(2, 0, -0.3), r.P(2, 2, -0.3), r.P(1.1, 1.1, -1.4)], rock[3]);
  r.commit();
  r.box(0, 0, -0.3, 2, 2, 0.3, '#8a5a34');
  r.commit();
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) r.tile(x, y, 'road');

  // Body.
  r.shadow(0.5, 0.5, 1.0, 1.0, 1.6);
  r.box(0.5, 0.5, 0, 1.0, 1.0, 0.85, '#d0453a');
  r.faceL(1.5, 0.58, 1.04, 0.56, 0.74, '#fff2c4');
  r.faceL(1.5, 0.79, 0.83, 0.58, 0.68, '#4f9a43');
  r.faceL(1.5, 0.74, 0.88, 0.67, 0.71, '#7cc35c');
  r.faceL(1.5, 1.18, 1.34, 0.46, 0.76, '#3a2f52');
  r.faceL(1.5, 1.2, 1.32, 0.48, 0.74, '#f2c13a');
  r.faceL(1.5, 1.25, 1.27, 0.52, 0.7, '#3a2f52');
  r.faceL(1.5, 0.66, 0.98, 0.16, 0.46, '#3a2f52');
  r.faceL(1.5, 0.68, 0.96, 0.18, 0.44, '#c9c3d6');
  r.faceR(1.5, 0.84, 1.22, 0.1, 0.44, '#3a2f52');
  r.faceR(1.5, 0.86, 1.2, 0.12, 0.42, '#2b2340');
  r.faceR(1.5, 0.86, 1.2, 0.38, 0.42, '#5e1f1a');
  r.commit();
  // Crank handle, turning in the plane of the front-left face.
  const hub = r.P(0.82, 1.5, 0.31);
  const end = r.P(0.82 + Math.cos(s.crank) * 0.13, 1.5, 0.31 + Math.sin(s.crank) * 0.13);
  const ink = r.tones('#3a2f52')[2];
  line(r.obj, hub, end, ink);
  line(r.obj, [hub[0] + 1, hub[1]], [end[0] + 1, end[1]], ink);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (dx * dx + dy * dy <= 5) r.obj.set(end[0] + dx, end[1] + dy, r.tones('#f7d24a')[2]);
  r.commit();
  // Tray in front of the chute.
  r.box(1.5, 0.82, 0, 0.32, 0.42, 0.1, '#8a2a24');
  r.commit();
  // Neck.
  r.box(0.6, 0.6, 0.85, 0.8, 0.8, 0.1, '#a9a3b8');
  r.commit();
  // Capsules inside the glass, back to front.
  const j = Math.sin(s.jiggle);
  for (const [x, y, z, c] of [...DOME].sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[2] - b[2])) {
    const [sx, sy] = r.P(x, y, z + (Math.round((x + y) * 10) % 2 ? j : -j) * 0.03);
    capsuleAt(r, sx, sy, 6, c);
    r.commit();
  }
  // Glass case: edges and a highlight only, so the capsules show through.
  const g0 = 0.58, g1 = 1.42, z0 = 0.95, z1 = 1.75;
  const glass = r.tones('#bfe8ff')[1];
  for (const [a, b] of [
    [r.P(g0, g1, z0), r.P(g1, g1, z0)], [r.P(g1, g1, z0), r.P(g1, g0, z0)],
    [r.P(g0, g1, z1), r.P(g1, g1, z1)], [r.P(g1, g1, z1), r.P(g1, g0, z1)], [r.P(g0, g0, z1), r.P(g1, g0, z1)], [r.P(g0, g0, z1), r.P(g0, g1, z1)],
    [r.P(g0, g1, z0), r.P(g0, g1, z1)], [r.P(g1, g1, z0), r.P(g1, g1, z1)], [r.P(g1, g0, z0), r.P(g1, g0, z1)],
  ] as [Pt, Pt][])
    line(r.main, a, b, glass);
  // A simple diagonal streak on the front glass.
  line(r.main, r.P(0.68, g1, 1.3), r.P(0.8, g1, 1.6), 0xffffffff);
  line(r.main, r.P(0.74, g1, 1.3), r.P(0.86, g1, 1.6), r.tones('#bfe8ff')[0]);
  // Cap.
  r.box(0.55, 0.55, 1.75, 0.9, 0.9, 0.1, '#d0453a');
  r.box(0.92, 0.92, 1.85, 0.16, 0.16, 0.08, '#f2c13a');
  r.commit();

  if (s.drop) {
    const d = s.drop;
    const [sx, sy] = r.P(d.x, d.y, d.z);
    capsuleAt(r, sx, sy, 8, d.color, d.tilt, d.open);
    r.commit();
  }
  const full = r.result(4, false);
  // Crop every frame to the same box: the machine and platform with a small margin.
  if (!cropBox) {
    let x0 = full.width, y0 = full.height, x1 = 0, y1 = 0;
    for (let i = 0; i < full.pixels.length; i++) {
      if (!full.pixels[i]) continue;
      const x = i % full.width, y = (i - x) / full.width;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    cropBox = { x: Math.max(0, x0 - 12), y: Math.max(0, y0 - 12), w: Math.min(full.width, x1 + 13) - Math.max(0, x0 - 12), h: Math.min(full.height, y1 + 13) - Math.max(0, y0 - 12) };
  }
  const cb = cropBox;
  const pixels = new Uint32Array(cb.w * cb.h);
  for (let y = 0; y < cb.h; y++) pixels.set(full.pixels.subarray((y + cb.y) * full.width + cb.x, (y + cb.y) * full.width + cb.x + cb.w), y * cb.w);
  paint(canvas, { ...full, width: cb.w, height: cb.h, pixels });
  const ctx = canvas.getContext('2d')!;
  if (s.drop && (s.glow || s.burst)) {
    const [px, py] = r.P(s.drop.x, s.drop.y, s.drop.z);
    const sx = px - cb.x, sy = py - cb.y;
    const dot = (x: number, y: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
    };
    if (s.glow && s.glow.amount > 0)
      for (let a = 0; a < 360; a += 8) {
        const rad = 12 + s.glow.amount * 4;
        dot(sx + Math.cos((a * Math.PI) / 180) * rad, sy + Math.sin((a * Math.PI) / 180) * rad * 0.7, s.glow.color);
      }
    if (s.burst)
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2, rad = 6 + s.burst.t * 34;
        dot(sx + Math.cos(a) * rad, sy + Math.sin(a) * rad * 0.7, i % 2 ? s.burst.color : '#ffffff');
      }
  }
  if (s.flash) {
    ctx.globalAlpha = s.flash.alpha;
    ctx.fillStyle = s.flash.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
  }
}

