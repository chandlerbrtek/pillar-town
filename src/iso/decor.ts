// Yard decorations bought with seeds. Each draws on one cell and commits itself.
import { fillPoly, hash, type Renderer } from './engine';

export interface Decor {
  id: string;
  name: string;
  price: number;
  draw: (r: Renderer, gx: number, gy: number) => void;
}

const WOOD = '#9a6436', DARK = '#5e3b22', STONE = '#c9c3d6', IRON = '#3a2f52';

export const DECOR: Decor[] = [
  {
    id: 'tulips', name: 'Tulip patch', price: 5,
    draw(r, gx, gy) {
      r.box(gx + 0.18, gy + 0.18, 0, 0.64, 0.64, 0.05, '#6b4226');
      const c = ['#e85d5d', '#f7d24a', '#f2a0c4', '#9b6fd1'];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        r.dot(gx + 0.26 + i * 0.15, gy + 0.26 + j * 0.15, 0.1, '#3f7f35');
        r.dot(gx + 0.26 + i * 0.15, gy + 0.26 + j * 0.15, 0.17, c[(i + j * 2) % 4], 3);
      }
      r.commit();
    },
  },
  {
    id: 'mailbox', name: 'Mailbox', price: 8,
    draw(r, gx, gy) {
      r.box(gx + 0.47, gy + 0.47, 0, 0.06, 0.06, 0.34, DARK);
      r.box(gx + 0.38, gy + 0.42, 0.34, 0.24, 0.16, 0.14, '#4f7cc9');
      r.box(gx + 0.62, gy + 0.44, 0.38, 0.02, 0.03, 0.18, '#d0453a');
      r.commit();
    },
  },
  {
    id: 'bench', name: 'Bench', price: 10,
    draw(r, gx, gy) {
      r.shadow(gx + 0.15, gy + 0.4, 0.7, 0.25, 0.3);
      for (const x of [0.18, 0.76]) r.box(gx + x, gy + 0.45, 0, 0.05, 0.2, 0.14, IRON);
      r.box(gx + 0.15, gy + 0.42, 0.14, 0.7, 0.24, 0.04, WOOD);
      r.box(gx + 0.15, gy + 0.42, 0.18, 0.7, 0.04, 0.18, WOOD);
      r.commit();
    },
  },
  {
    id: 'hedge', name: 'Round hedges', price: 12,
    draw(r, gx, gy) {
      r.shadow(gx + 0.15, gy + 0.15, 0.7, 0.7, 0.4);
      for (const [x, y, s] of [[0.32, 0.3, 0.9], [0.68, 0.36, 0.75], [0.45, 0.68, 1]]) {
        const [sx, sy] = r.P(gx + x, gy + y, 0.18 * s);
        r.blob(sx, sy, r.tw * 0.16 * s, r.tw * 0.13 * s, '#3f8f45');
      }
      r.commit();
    },
  },
  {
    id: 'mushrooms', name: 'Mushroom ring', price: 15,
    draw(r, gx, gy) {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const x = gx + 0.5 + Math.cos(a) * 0.28, y = gy + 0.5 + Math.sin(a) * 0.28;
        r.box(x - 0.02, y - 0.02, 0, 0.04, 0.04, 0.08, '#f0e6d0');
        const [sx, sy] = r.P(x, y, 0.1);
        r.blob(sx, sy, r.tw * 0.05, r.tw * 0.035, '#d0453a');
        r.dot(x - 0.01, y, 0.12, '#fff8e7', 1);
      }
      r.commit();
    },
  },
  {
    id: 'lantern', name: 'Street lantern', price: 18,
    draw(r, gx, gy) {
      r.box(gx + 0.44, gy + 0.44, 0, 0.12, 0.12, 0.05, IRON);
      r.box(gx + 0.47, gy + 0.47, 0.05, 0.06, 0.06, 0.62, IRON);
      r.box(gx + 0.42, gy + 0.42, 0.67, 0.16, 0.16, 0.14, '#f7d24a');
      r.pyramid(gx + 0.4, gy + 0.4, gx + 0.6, gy + 0.6, 0.81, 0.08, IRON);
      for (const [dx, dy, dz] of [[-0.16, 0, 0.74], [0.16, 0, 0.7], [0, 0.16, 0.66]]) r.dot(gx + 0.5 + dx, gy + 0.5 + dy, dz, '#fff2a8');
      r.commit();
    },
  },
  {
    id: 'birdbath', name: 'Bird bath', price: 20,
    draw(r, gx, gy) {
      r.box(gx + 0.42, gy + 0.42, 0, 0.16, 0.16, 0.04, STONE);
      r.box(gx + 0.46, gy + 0.46, 0.04, 0.08, 0.08, 0.24, STONE);
      r.box(gx + 0.32, gy + 0.32, 0.28, 0.36, 0.36, 0.06, STONE);
      const t = r.tones('#5fb8e8');
      fillPoly(r.obj, [r.P(gx + 0.36, gy + 0.36, 0.34), r.P(gx + 0.64, gy + 0.36, 0.34), r.P(gx + 0.64, gy + 0.64, 0.34), r.P(gx + 0.36, gy + 0.64, 0.34)], (x, y) => (hash(x, y) < 80 ? t[0] : t[2]));
      const [bx, by] = r.P(gx + 0.6, gy + 0.4, 0.4);
      r.blob(bx, by, r.tw * 0.04, r.tw * 0.035, '#d0453a');
      r.commit();
    },
  },
  {
    id: 'picnic', name: 'Picnic table', price: 25,
    draw(r, gx, gy) {
      r.shadow(gx + 0.15, gy + 0.2, 0.7, 0.6, 0.35);
      r.box(gx + 0.15, gy + 0.2, 0, 0.7, 0.12, 0.12, WOOD);
      r.box(gx + 0.3, gy + 0.4, 0, 0.06, 0.2, 0.22, DARK);
      r.box(gx + 0.64, gy + 0.4, 0, 0.06, 0.2, 0.22, DARK);
      r.box(gx + 0.2, gy + 0.36, 0.22, 0.6, 0.28, 0.04, WOOD);
      r.box(gx + 0.15, gy + 0.68, 0, 0.7, 0.12, 0.12, WOOD);
      r.dot(gx + 0.42, gy + 0.46, 0.27, '#d0453a', 3);
      r.dot(gx + 0.55, gy + 0.5, 0.27, '#fff8e7', 3);
      r.commit();
    },
  },
  {
    id: 'well', name: 'Wishing well', price: 40,
    draw(r, gx, gy) {
      r.shadow(gx + 0.2, gy + 0.2, 0.6, 0.6, 0.8);
      r.box(gx + 0.25, gy + 0.25, 0, 0.5, 0.5, 0.22, '#a9a3b8');
      fillPoly(r.obj, [r.P(gx + 0.32, gy + 0.32, 0.22), r.P(gx + 0.68, gy + 0.32, 0.22), r.P(gx + 0.68, gy + 0.68, 0.22), r.P(gx + 0.32, gy + 0.68, 0.22)], r.tones('#2b4a7a')[3]);
      r.box(gx + 0.26, gy + 0.47, 0.22, 0.05, 0.06, 0.36, DARK);
      r.box(gx + 0.69, gy + 0.47, 0.22, 0.05, 0.06, 0.36, DARK);
      r.gable(gx + 0.2, gy + 0.3, gx + 0.8, gy + 0.7, 0.58, 0.2, '#c8553d', DARK);
      r.box(gx + 0.46, gy + 0.46, 0.3, 0.08, 0.08, 0.08, WOOD);
      r.commit();
    },
  },
  {
    id: 'statue', name: 'Hero statue', price: 60,
    draw(r, gx, gy) {
      r.shadow(gx + 0.25, gy + 0.25, 0.5, 0.5, 1.1);
      r.box(gx + 0.28, gy + 0.28, 0, 0.44, 0.44, 0.12, '#a9a3b8');
      r.box(gx + 0.34, gy + 0.34, 0.12, 0.32, 0.32, 0.18, STONE);
      r.box(gx + 0.43, gy + 0.45, 0.3, 0.06, 0.06, 0.2, '#e4e0ee');
      r.box(gx + 0.52, gy + 0.45, 0.3, 0.06, 0.06, 0.2, '#e4e0ee');
      r.box(gx + 0.41, gy + 0.43, 0.5, 0.2, 0.12, 0.26, '#e4e0ee');
      const [hx, hy] = r.P(gx + 0.51, gy + 0.49, 0.84);
      r.blob(hx, hy, r.tw * 0.06, r.tw * 0.06, '#e4e0ee');
      r.box(gx + 0.63, gy + 0.47, 0.6, 0.04, 0.04, 0.4, '#d4b03a');
      r.commit();
    },
  },
];

export const findDecor = (id: string) => DECOR.find((d) => d.id === id);
