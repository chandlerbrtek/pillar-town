import { variantFor, type DayBlock, type WeekBlock } from '../town';
import { PILLAR_INFO } from '../pillars';
import { PILLARS, type Pillar } from '../types';
import { drawItem, levelFor, MAX_ITEM_HEIGHT, type IsoItem, type Level } from './buildings';
import { fillPoly, hash, hex, line, pack, Renderer, type Rendered } from './engine';

/** Where each pillar sits in a day's 3x3 block. The center (1, 1) holds the lamp. */
export const PILLAR_POS: Record<Pillar, [number, number]> = {
  mind: [0, 0], spirit: [1, 0], craft: [2, 0],
  bond: [0, 1], fortune: [2, 1],
  heart: [0, 2], vitality: [1, 2], harmony: [2, 2],
};

/** Tap ids on a day block: 1-8 = pillars in PILLARS order, 9 = the lamp. */
export const DAY_LAMP_ID = 9;
export const dayPillarId = (p: Pillar) => PILLARS.indexOf(p) + 1;

/** Blocks on a week island. Days run clockwise from the top corner. */
const DAY_SLOTS: [number, number][] = [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2]];
const GARDEN_SLOT: [number, number] = [0, 1];
const PLAZA_SLOT: [number, number] = [1, 1];
/** Tap ids on a week island: 1-7 = Monday to Sunday, 8 = plaza, 9 = garden. */
export const WEEK_PLAZA_ID = 8;
export const WEEK_GARDEN_ID = 9;

const TOP = MAX_ITEM_HEIGHT;
const MAX_DEPTH = 2.6;

function makeIsland(N: number, M: number, tw: number) {
  const hw = tw / 2, hh = tw / 4, zs = tw / 2, pad = 8;
  const W = Math.ceil((N + M) * hw + pad * 2);
  const H = Math.ceil((N + M) * hh + (TOP + MAX_DEPTH) * zs + pad * 2);
  return new Renderer(tw, W, H, M * hw + pad, TOP * zs + pad);
}

/** Grass top, dirt sides and a rocky point underneath. */
function islandBase(r: Renderer, N: number, M: number) {
  const depth = Math.min(0.45 + (N + M) * 0.32, MAX_DEPTH);
  const apex = r.P(N * 0.55, M * 0.55, -depth);
  const rock = r.tones('#6a6a78');
  const fill = (b: number) => (x: number, y: number) => {
    const h = hash(x, y);
    return h < 80 ? rock[b + 1] : h < 140 ? rock[b - 1] : rock[b];
  };
  r.currentId = 0;
  fillPoly(r.obj, [r.P(0, M, -0.45), r.P(N, M, -0.45), apex], fill(2));
  fillPoly(r.obj, [r.P(N, 0, -0.45), r.P(N, M, -0.45), apex], fill(3));
  r.commit();
  r.box(0, 0, -0.45, N, M, 0.45, '#8a5a34');
  const layer = r.faces('#6b4a30'), lip = r.faces('#4f9a43');
  r.faceL(M, 0, N, -0.3, -0.26, layer.left);
  r.faceR(N, 0, M, -0.3, -0.26, layer.right);
  r.faceL(M, 0, N, -0.07, 0, lip.left);
  r.faceR(N, 0, M, -0.07, 0, lip.right);
  r.commit();
}

interface Thing {
  gx: number;
  gy: number;
  id: number;
  item: IsoItem;
}

function drawThings(r: Renderer, things: Thing[]) {
  things.sort((a, b) => a.gx + a.gy - (b.gx + b.gy) || a.gx - b.gx);
  for (const t of things) {
    r.currentId = t.id;
    drawItem(r, t.item, t.gx, t.gy);
  }
}

export function pillarItem(day: DayBlock, p: Pillar): IsoItem | null {
  const level = levelFor(day.counts[p]);
  return level ? { kind: p, level: level as Level, variant: variantFor(day.day + p) } : null;
}

function dayThings(day: DayBlock, ox: number, oy: number, id: (p: Pillar | 'lamp') => number): Thing[] {
  const things: Thing[] = [];
  for (const p of PILLARS) {
    const item = pillarItem(day, p);
    if (item) things.push({ gx: ox + PILLAR_POS[p][0], gy: oy + PILLAR_POS[p][1], id: id(p), item });
  }
  things.push({ gx: ox + 1, gy: oy + 1, id: id('lamp'), item: { kind: 'lamp', lit: day.balanced } });
  return things;
}

/** One day's 3x3 block as a small floating island. Open lots show as dashed outlines. */
export function renderDay(day: DayBlock, tw = 64, opts: { hideLot?: Pillar } = {}): Rendered {
  const r = makeIsland(3, 3, tw);
  islandBase(r, 3, 3);
  const at = new Map<string, number>(PILLARS.map((p) => [PILLAR_POS[p].join(','), dayPillarId(p)]));
  for (let y = 0; y < 3; y++)
    for (let x = 0; x < 3; x++) {
      const center = x === 1 && y === 1;
      r.currentId = center ? DAY_LAMP_ID : at.get(`${x},${y}`)!;
      r.tile(x, y, center ? 'road' : 'grass');
    }
  for (const p of PILLARS) if (!day.counts[p] && p !== opts.hideLot) r.dashedDiamond(PILLAR_POS[p][0], PILLAR_POS[p][1], PILLAR_INFO[p].color);
  drawThings(r, dayThings(day, 0, 0, (k) => (k === 'lamp' ? DAY_LAMP_ID : dayPillarId(k))));
  // Full frame, so every render of a day is the same size and frames can be animated between them.
  return r.result(4, false);
}

/** A week as one island: seven day blocks around a plaza, plus the wilt and restore garden. */
export function renderWeek(week: WeekBlock, tw = 36): Rendered {
  const S = 9;
  const r = makeIsland(S, S, tw);
  islandBase(r, S, S);
  const slotId = new Map<string, number>();
  DAY_SLOTS.forEach(([bx, by], i) => slotId.set(`${bx},${by}`, i + 1));
  slotId.set(PLAZA_SLOT.join(','), WEEK_PLAZA_ID);
  slotId.set(GARDEN_SLOT.join(','), WEEK_GARDEN_ID);

  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const bx = Math.floor(x / 3), by = Math.floor(y / 3);
      const id = slotId.get(`${bx},${by}`)!;
      const isPlaza = id === WEEK_PLAZA_ID;
      const dayIndex = id - 1;
      const isLampSquare = x % 3 === 1 && y % 3 === 1 && id <= 7 && week.days[dayIndex].active;
      r.currentId = id;
      r.tile(x, y, isPlaza || isLampSquare ? 'road' : 'grass');
    }

  // Thin paths along the block edges.
  const path = pack(hex('#c9b48a')), edge = pack(hex('#a08a64'));
  for (const k of [3, 6])
    for (const [a, b] of [[r.P(k, 0), r.P(k, S)], [r.P(0, k), r.P(S, k)]]) {
      line(r.main, [a[0], a[1] - 1], [b[0], b[1] - 1], edge);
      line(r.main, a, b, path);
      line(r.main, [a[0], a[1] + 1], [b[0], b[1] + 1], path);
    }

  const things: Thing[] = [];
  week.days.forEach((day, i) => {
    if (!day.active) return;
    const [bx, by] = DAY_SLOTS[i];
    things.push(...dayThings(day, bx * 3, by * 3, () => i + 1));
  });
  const [gx0, gy0] = GARDEN_SLOT.map((v) => v * 3);
  week.wilted.slice(0, 9).forEach((spot, i) => {
    things.push({ gx: gx0 + (i % 3), gy: gy0 + Math.floor(i / 3), id: WEEK_GARDEN_ID, item: { kind: spot.restoredIn ? 'blossom' : 'wilted' } });
  });
  const [px, py] = PLAZA_SLOT.map((v) => v * 3);
  things.push({ gx: px + 1, gy: py + 1, id: WEEK_PLAZA_ID, item: { kind: 'plaza', earned: week.fullWeek } });
  // The plaza item draws relative to its block's corner.
  const plaza = things[things.length - 1];
  things.sort((a, b) => a.gx + a.gy - (b.gx + b.gy) || a.gx - b.gx);
  for (const t of things) {
    r.currentId = t.id;
    if (t === plaza) drawItem(r, t.item, px, py);
    else drawItem(r, t.item, t.gx, t.gy);
  }
  return r.result();
}

const iconCache = new Map<string, string>();

/** A single item on a grass tile, as an image URL. Used for small icons. */
export function iconUrl(item: IsoItem): string {
  const key = JSON.stringify(item);
  const cached = iconCache.get(key);
  if (cached) return cached;
  const tw = 32, hw = tw / 2, zs = tw / 2;
  const r = new Renderer(tw, tw + 8, tw + TOP * zs + 8, hw + 4, TOP * zs + 4);
  r.tile(0, 0);
  drawItem(r, item, 0, 0);
  const url = toDataUrl(r.result(1));
  iconCache.set(key, url);
  return url;
}

export function toDataUrl(img: Rendered): string {
  const canvas = document.createElement('canvas');
  paint(canvas, img);
  return canvas.toDataURL();
}

export function paint(canvas: HTMLCanvasElement, img: Rendered) {
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  const data = ctx.createImageData(img.width, img.height);
  new Uint32Array(data.data.buffer).set(img.pixels);
  ctx.putImageData(data, 0, 0);
}
