import { drawItem, MAX_ITEM_HEIGHT, type IsoItem } from './buildings';
import { fillPoly, hash, Renderer, type Rendered } from './engine';

const ISLAND_TILE = 44;

/**
 * Draws a week as a floating island with one item per cell.
 * Item i gets id i + 1 in the result's id map, so taps can find it.
 */
export function renderIsland(items: IsoItem[]): Rendered {
  const N = Math.max(3, Math.ceil(Math.sqrt(items.length)));
  const M = Math.max(3, Math.ceil(items.length / N));
  const tw = ISLAND_TILE, hw = tw / 2, hh = tw / 4, zs = tw / 2, pad = 6;
  const depth = 0.45 + (N + M) * 0.32;
  const W = Math.ceil((N + M) * hw + pad * 2);
  const H = Math.ceil((N + M) * hh + (MAX_ITEM_HEIGHT + depth) * zs + pad * 2);
  const r = new Renderer(tw, W, H, M * hw + pad, MAX_ITEM_HEIGHT * zs + pad);

  // Rocky underside tapering to a point.
  const apex = r.P(N * 0.55, M * 0.55, -depth);
  const rock = r.tones('#6a6a78');
  const rockFill = (base: number) => (x: number, y: number) => {
    const h = hash(x, y);
    return h < 80 ? rock[base + 1] : h < 140 ? rock[base - 1] : rock[base];
  };
  fillPoly(r.obj, [r.P(0, M, -0.45), r.P(N, M, -0.45), apex], rockFill(2));
  fillPoly(r.obj, [r.P(N, 0, -0.45), r.P(N, M, -0.45), apex], rockFill(3));
  r.commit();

  // Dirt sides with a rock layer and grass hanging over the edge.
  r.box(0, 0, -0.45, N, M, 0.45, '#8a5a34');
  const layer = r.faces('#6b4a30'), lip = r.faces('#4f9a43');
  r.faceL(M, 0, N, -0.3, -0.26, layer.left);
  r.faceR(N, 0, M, -0.3, -0.26, layer.right);
  r.faceL(M, 0, N, -0.07, 0, lip.left);
  r.faceR(N, 0, M, -0.07, 0, lip.right);
  r.commit();

  const cells = items.map((item, i) => ({ item, id: i + 1, gx: i % N, gy: Math.floor(i / N) }));
  for (let gy = 0; gy < M; gy++)
    for (let gx = 0; gx < N; gx++) {
      r.currentId = cells.find((c) => c.gx === gx && c.gy === gy)?.id ?? 0;
      r.tile(gx, gy);
    }
  // Paint from back to front.
  cells.sort((a, b) => a.gx + a.gy - (b.gx + b.gy) || a.gx - b.gx);
  for (const c of cells) {
    r.currentId = c.id;
    drawItem(r, c.item, c.gx, c.gy);
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
  const r = new Renderer(tw, tw + 8, tw + MAX_ITEM_HEIGHT * zs + 8, hw + 4, MAX_ITEM_HEIGHT * zs + 4);
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
