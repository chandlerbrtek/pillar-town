// SPOILERS: the full critter roster. 30 common, 25 uncommon, 20 rare, 12 epic, 8 legendary, 4 mythic.
import type { Renderer } from '../iso/engine';
import type { Fx, Look } from './art';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
export const RARITY_LABEL: Record<Rarity, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary', mythic: 'Mythic' };
export const RARITY_COLOR: Record<Rarity, string> = { common: '#cfd8c8', uncommon: '#7cc35c', rare: '#5aa7f0', epic: '#b06ff0', legendary: '#f2c13a', mythic: '#ff7ad9' };

export interface Critter {
  key: string;
  name: string;
  rarity: Rarity;
  /** A base shape from art.ts, or a mythic's own shape. */
  shape: string;
  look: Look;
  /** Legendaries: the crown jewel's color. */
  jewel?: string;
}

const L = (name: string, body: string, accent: string, detail: string, extra: Partial<Look> = {}): Look => ({ name, body, accent, detail, ...extra });

// Per critter: two natural looks (a, b), a third color (c) for some, and a rare pattern.
const LOOKS: Record<string, { name: string; a: Look; b: Look; c?: Look; rare: Look }> = {
  cat: { name: 'Cat', a: L('Ginger Cat', '#e8913a', '#c8553d', '#f7d9b0', { mark: 'stripes', markColor: '#c8603a' }), b: L('Gray Cat', '#9a96a8', '#6a6a78', '#e4e0ee'), c: L('Black Cat', '#3a3448', '#5a5068', '#7a7088'), rare: L('Calico Cat', '#fff8e7', '#e8913a', '#fff8e7', { mark: 'patch', markColor: '#3a2f52' }) },
  dog: { name: 'Dog', a: L('Brown Dog', '#a8703e', '#6b4226', '#f0d8b8'), b: L('Golden Dog', '#e0b060', '#a07030', '#fff0c8'), c: L('Gray Dog', '#8a8a96', '#5a5a66', '#d0d0d8'), rare: L('Dalmatian', '#f8f8f8', '#2b2340', '#ffffff', { mark: 'spots', markColor: '#2b2340' }) },
  fox: { name: 'Fox', a: L('Red Fox', '#d9662f', '#3a2f52', '#fff8e7', { mark: 'socks', markColor: '#3a2f52' }), b: L('Sand Fox', '#e8c87a', '#9a6436', '#fff8e7'), c: L('Brown Fox', '#8a5a3a', '#3a2f52', '#e8d0b0'), rare: L('Silver Fox', '#8a8a9a', '#2b2340', '#f0f0f4', { mark: 'socks', markColor: '#2b2340' }) },
  bunny: { name: 'Bunny', a: L('Cream Bunny', '#f0e6d0', '#f2a7c3', '#ffffff'), b: L('Brown Bunny', '#9a6436', '#f2a7c3', '#f0e6d0'), c: L('Gray Bunny', '#a8a4b0', '#f2a7c3', '#e8e4ec'), rare: L('Dutch Bunny', '#fff8e7', '#f2a7c3', '#ffffff', { mark: 'patch', markColor: '#5e3b22' }) },
  mouse: { name: 'Mouse', a: L('Field Mouse', '#b09070', '#f2a7c3', '#f0e0d0'), b: L('White Mouse', '#f4f0f0', '#f2a7c3', '#ffffff'), c: L('Gray Mouse', '#8a8690', '#f2a7c3', '#d8d4dc'), rare: L('Spotted Mouse', '#fff8e7', '#f2a7c3', '#ffffff', { mark: 'spots', markColor: '#8a5a3a' }) },
  bear: { name: 'Bear Cub', a: L('Brown Cub', '#7a4a2a', '#5e3b22', '#c8a070'), b: L('Honey Cub', '#d9a050', '#a07030', '#f0d090'), c: L('Black Cub', '#3a3440', '#2b2340', '#a08870'), rare: L('Panda Cub', '#f8f8f8', '#2b2340', '#ffffff', { mark: 'socks', markColor: '#2b2340' }) },
  pig: { name: 'Piglet', a: L('Pink Piglet', '#f2a7c3', '#d9668f', '#f8d0e0'), b: L('Tan Piglet', '#e8c8a8', '#c89070', '#f8e8d8'), c: L('Black Piglet', '#4a4048', '#d9668f', '#7a6a72'), rare: L('Spotted Piglet', '#f8d8e0', '#d9668f', '#fff0f4', { mark: 'spots', markColor: '#5e3b22' }) },
  deer: { name: 'Fawn', a: L('Spotted Fawn', '#c8885a', '#7a4a2a', '#fff2dc', { mark: 'spots', markColor: '#fff2dc' }), b: L('Dusk Fawn', '#a07a6a', '#5e3b22', '#e8d8c8'), c: L('Red Fawn', '#b0603a', '#5e3b22', '#f0d8c0'), rare: L('Snow Fawn', '#f4f0ec', '#9a7a6a', '#ffffff', { mark: 'spots', markColor: '#c8b0a0' }) },
  sheep: { name: 'Lamb', a: L('Woolly Lamb', '#f4f0e8', '#3a2f52', '#ffffff'), b: L('Black Lamb', '#4a4458', '#2b2340', '#6a6a78'), c: L('Brown Lamb', '#b08860', '#4a2e1a', '#d8c0a0'), rare: L('Cloud Lamb', '#ffffff', '#a8c8e8', '#ffffff') },
  hedgehog: { name: 'Hedgehog', a: L('Brown Hedgehog', '#7a5a3a', '#e8c8a0', '#4a2e1a'), b: L('Pale Hedgehog', '#c8b090', '#fff0dc', '#7a5a3a'), c: L('Dark Hedgehog', '#4a3a2a', '#d8c0a0', '#2a1e14'), rare: L('Albino Hedgehog', '#f4f0ec', '#f8c8d0', '#e0d0d0') },
  chick: { name: 'Chick', a: L('Yellow Chick', '#f7d24a', '#e8913a', '#fff2a8'), b: L('Speckled Chick', '#d9b48a', '#e8913a', '#f0e6d0'), c: L('Peach Chick', '#f8c8a0', '#e8913a', '#fff0e0'), rare: L('Silkie Chick', '#ffffff', '#3a2f52', '#f4f0ff') },
  duck: { name: 'Duckling', a: L('Mallard Duckling', '#5a8a4a', '#f7c948', '#c8b080'), b: L('White Duckling', '#f4f4f4', '#e8913a', '#d8d8e0'), c: L('Brown Duckling', '#a08060', '#e8913a', '#d8c0a0'), rare: L('Mandarin Duckling', '#e8803a', '#c8403a', '#5a8ae0', { mark: 'stripes', markColor: '#fff8e7' }) },
  owl: { name: 'Owlet', a: L('Barn Owlet', '#c8a070', '#e8913a', '#fff2dc'), b: L('Brown Owlet', '#7a5a3a', '#e8c070', '#d8b890'), c: L('Gray Owlet', '#9a96a8', '#e8c070', '#d8d4e0'), rare: L('Snowy Owlet', '#f8f8fc', '#2b2340', '#ffffff', { mark: 'spots', markColor: '#3a2f52' }) },
  penguin: { name: 'Penguin', a: L('Emperor Penguin', '#2f3a52', '#f7c948', '#fff8e7'), b: L('Gentoo Penguin', '#3a3a4a', '#e8603a', '#f4f4f4'), c: L('Little Blue Penguin', '#4a6aa0', '#e8c070', '#e8f0ff'), rare: L('Rockhopper', '#2b2a3a', '#f7d24a', '#ffffff', { mark: 'patch', markColor: '#f7d24a' }) },
  frog: { name: 'Frog', a: L('Pond Frog', '#5aa04a', '#c8e89a', '#c8e89a'), b: L('Tree Frog', '#7cc35c', '#e85d5d', '#e8f4c0'), c: L('Lime Frog', '#a8e04a', '#5a9a2a', '#f0f8d0'), rare: L('Dart Frog', '#3a7ad0', '#2b2340', '#9ac8f0', { mark: 'spots', markColor: '#2b2340' }) },
  turtle: { name: 'Turtle', a: L('Pond Turtle', '#6a9a3a', '#a0c070', '#4a3a22'), b: L('Box Turtle', '#a08050', '#c8b080', '#5e3b22'), rare: L('Star Turtle', '#3a3a2a', '#c8b060', '#f7d24a') },
  snail: { name: 'Snail', a: L('Garden Snail', '#c8885a', '#c8c0b0', '#8a5a34'), b: L('Moss Snail', '#7a9a5a', '#d0c8b0', '#4a6a3a'), rare: L('Candy Snail', '#f2a0c4', '#c8e8f0', '#fff2a8') },
  crab: { name: 'Crab', a: L('Shore Crab', '#e8603a', '#fff8e7', '#2b2340'), b: L('Sand Crab', '#e8b070', '#fff8e7', '#2b2340'), rare: L('Blue Crab', '#4a7ac8', '#e85d3a', '#2b2340') },
  slime: { name: 'Slime', a: L('Green Slime', '#7cc35c', '#3f8f45', '#e8ffd8'), b: L('Blue Slime', '#5aa7f0', '#3a6ab0', '#e0f0ff'), rare: L('Bubble Slime', '#f2a0c4', '#d9668f', '#ffffff', { mark: 'spots', markColor: '#ffffff' }) },
  axolotl: { name: 'Axolotl', a: L('Pink Axolotl', '#f2a7c3', '#e8607a', '#f8d0e0'), b: L('Wild Axolotl', '#7a6a5a', '#c8a0c0', '#a09080'), rare: L('Golden-Eyed Axolotl', '#f8f0d0', '#e8a030', '#fff8e7', { mark: 'spots', markColor: '#e8c060' }) },
};

const ORDER = Object.keys(LOOKS);

// Epic elements, and which critters get them.
const ELEMENTS: Record<Exclude<Fx, 'none'>, { name: string; body: string; accent: string; detail: string; jewel: string }> = {
  cosmic: { name: 'Cosmic', body: '#2a2a6a', accent: '#fff2a8', detail: '#6a6ad0', jewel: '#6a7aff' },
  magma: { name: 'Magma', body: '#3a2a2a', accent: '#ff6a2a', detail: '#ffb03a', jewel: '#ff5a1a' },
  spectral: { name: 'Spectral', body: '#bff4ec', accent: '#6ad8c8', detail: '#ffffff', jewel: '#3ad8c0' },
  thorn: { name: 'Thorn', body: '#3f6a2a', accent: '#9ad050', detail: '#2a4a1a', jewel: '#4aa02a' },
  glacier: { name: 'Glacier', body: '#cfeeff', accent: '#5ab0e8', detail: '#ffffff', jewel: '#3aa8f0' },
  neon: { name: 'Neon', body: '#2b2340', accent: '#ff4ad0', detail: '#3ae8ff', jewel: '#ff3ad0' },
};
const EPIC_PICKS: [string, Exclude<Fx, 'none'>][] = [
  ['owl', 'cosmic'], ['deer', 'cosmic'], ['turtle', 'magma'], ['crab', 'magma'], ['cat', 'spectral'], ['axolotl', 'spectral'],
  ['hedgehog', 'thorn'], ['frog', 'thorn'], ['penguin', 'glacier'], ['fox', 'glacier'], ['slime', 'neon'], ['bunny', 'neon'],
];
const LEGENDARY_PICKS = ['owl', 'deer', 'turtle', 'cat', 'frog', 'penguin', 'slime', 'axolotl'];

/** Halfway between a color and warm white: a soft tint that sits well on gold. */
function softTint(c: string): string {
  const a = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)), w = [255, 242, 196];
  return '#' + a.map((v, i) => Math.round((v + w[i]) / 2).toString(16).padStart(2, '0')).join('');
}

// ---------- Mythic creatures ----------
const EYE = '#2b2340';
export const MYTHIC_SHAPES: Record<string, (r: Renderer, gx: number, gy: number, l: Look) => void> = {
  starwhale: (r, gx, gy, l) => {
    // A whale swimming through the air, flukes raised, stars on its back.
    r.shadow(gx + 0.2, gy + 0.2, 0.6, 0.6, 0.6);
    r.box(gx + 0.44, gy + 0.06, 0.32, 0.12, 0.12, 0.08, l.body);
    r.box(gx + 0.32, gy + 0.02, 0.4, 0.36, 0.08, 0.04, l.accent);
    r.box(gx + 0.3, gy + 0.16, 0.2, 0.4, 0.44, 0.26, l.body);
    r.faceL(gy + 0.6, gx + 0.32, gx + 0.68, 0.2, 0.3, l.detail);
    r.box(gx + 0.18, gy + 0.36, 0.22, 0.12, 0.16, 0.03, l.accent);
    r.box(gx + 0.7, gy + 0.36, 0.22, 0.12, 0.16, 0.03, l.accent);
    r.box(gx + 0.32, gy + 0.58, 0.2, 0.36, 0.18, 0.22, l.body);
    r.faceL(gy + 0.76, gx + 0.38, gx + 0.43, 0.32, 0.37, EYE);
    r.faceL(gy + 0.76, gx + 0.57, gx + 0.62, 0.32, 0.37, EYE);
    for (const [x, y] of [[0.4, 0.3], [0.56, 0.4], [0.46, 0.5], [0.6, 0.24]]) r.dot(gx + x, gy + y, 0.47, '#fff2a8', 2);
  },
  griffin: (r, gx, gy, l) => {
    // A lion's body with an eagle's head and raised wings.
    r.shadow(gx + 0.24, gy + 0.2, 0.52, 0.6, 0.7);
    for (const [dx, dy] of [[0.36, 0.24], [0.58, 0.24], [0.36, 0.5], [0.58, 0.5]]) r.box(gx + dx, gy + dy, 0, 0.06, 0.06, 0.14, l.body);
    r.box(gx + 0.48, gy + 0.08, 0.2, 0.04, 0.16, 0.04, l.body);
    r.box(gx + 0.46, gy + 0.04, 0.2, 0.08, 0.06, 0.08, l.accent);
    r.box(gx + 0.34, gy + 0.22, 0.14, 0.32, 0.36, 0.18, l.body);
    r.box(gx + 0.12, gy + 0.26, 0.3, 0.24, 0.22, 0.04, l.accent);
    r.box(gx + 0.64, gy + 0.26, 0.3, 0.24, 0.22, 0.04, l.accent);
    r.box(gx + 0.38, gy + 0.52, 0.24, 0.24, 0.22, 0.24, l.detail);
    r.box(gx + 0.45, gy + 0.74, 0.3, 0.1, 0.08, 0.06, '#f7c948');
    r.box(gx + 0.47, gy + 0.8, 0.27, 0.06, 0.04, 0.04, '#f7c948');
    r.faceL(gy + 0.74, gx + 0.41, gx + 0.45, 0.38, 0.43, EYE);
    r.faceL(gy + 0.74, gx + 0.55, gx + 0.59, 0.38, 0.43, EYE);
  },
  serpent: (r, gx, gy, l) => {
    // Coils rising out of the ground like waves, a frilled head at the front.
    r.shadow(gx + 0.2, gy + 0.14, 0.6, 0.7, 0.4);
    const coils: [number, number, number][] = [[0.14, 0, 0.16], [0.26, 0.06, 0.26], [0.38, 0, 0.18], [0.5, 0.04, 0.3]];
    for (const [y, z, h] of coils) {
      r.box(gx + 0.38, gy + y, z, 0.2, 0.12, h, l.body);
      r.box(gx + 0.44, gy + y + 0.02, z + h, 0.08, 0.08, 0.04, l.accent);
    }
    r.box(gx + 0.34, gy + 0.6, 0.22, 0.28, 0.2, 0.2, l.body);
    r.box(gx + 0.24, gy + 0.64, 0.3, 0.1, 0.04, 0.14, l.accent);
    r.box(gx + 0.62, gy + 0.64, 0.3, 0.1, 0.04, 0.14, l.accent);
    r.faceL(gy + 0.8, gx + 0.36, gx + 0.62, 0.23, 0.27, l.detail);
    r.faceL(gy + 0.8, gx + 0.39, gx + 0.44, 0.32, 0.37, '#fff2a8');
    r.faceL(gy + 0.8, gx + 0.52, gx + 0.57, 0.32, 0.37, '#fff2a8');
  },
  elderstag: (r, gx, gy, l) => {
    // A pale stag with antlers that grow leaves and glowing lantern fruit.
    r.shadow(gx + 0.26, gy + 0.2, 0.48, 0.56, 0.9);
    for (const [dx, dy] of [[0.38, 0.26], [0.56, 0.26], [0.38, 0.5], [0.56, 0.5]]) r.box(gx + dx, gy + dy, 0, 0.05, 0.05, 0.24, l.body);
    r.box(gx + 0.36, gy + 0.24, 0.24, 0.26, 0.32, 0.16, l.body);
    r.box(gx + 0.39, gy + 0.52, 0.32, 0.2, 0.2, 0.18, l.body);
    r.box(gx + 0.44, gy + 0.72, 0.34, 0.1, 0.06, 0.08, l.detail);
    r.faceL(gy + 0.72, gx + 0.42, gx + 0.46, 0.42, 0.47, EYE);
    r.faceL(gy + 0.72, gx + 0.54, gx + 0.58, 0.42, 0.47, EYE);
    for (const side of [0, 1]) {
      const ax = gx + (side ? 0.56 : 0.4);
      r.box(ax, gy + 0.6, 0.5, 0.03, 0.03, 0.24, l.accent);
      r.box(ax + (side ? 0 : -0.1), gy + 0.6, 0.66, 0.13, 0.03, 0.03, l.accent);
      const [lx, ly] = r.P(ax + (side ? 0.12 : -0.08), gy + 0.6, 0.8);
      r.blob(lx, ly, r.tw * 0.07, r.tw * 0.05, '#6cc35c');
      r.dot(ax + (side ? 0.1 : -0.06), gy + 0.6, 0.86, '#fff2a8', 2);
    }
  },
};

const MYTHICS: Critter[] = [
  { key: 'mythic-starwhale', name: 'Starwhale', rarity: 'mythic', shape: 'starwhale', look: L('Starwhale', '#3a4ab0', '#9ad8ff', '#e8f0ff') },
  { key: 'mythic-griffin', name: 'Griffin', rarity: 'mythic', shape: 'griffin', look: L('Griffin', '#d0a050', '#a06a2a', '#ffffff') },
  { key: 'mythic-serpent', name: 'Tidal Serpent', rarity: 'mythic', shape: 'serpent', look: L('Tidal Serpent', '#2a9a9a', '#f7c948', '#bff4ec') },
  { key: 'mythic-elderstag', name: 'Elder Stag', rarity: 'mythic', shape: 'elderstag', look: L('Elder Stag', '#f0eef8', '#a8c8a0', '#d8d4e8') },
];

// ---------- The roster ----------
const c = (key: string, rarity: Rarity, shape: string, look: Look, jewel?: string): Critter => ({ key, name: look.name, rarity, shape, look, jewel });

export const CRITTERS: Critter[] = [
  ...ORDER.map((s) => c(`${s}-a`, 'common', s, LOOKS[s].a)),
  ...ORDER.slice(0, 10).map((s) => c(`${s}-b`, 'common', s, LOOKS[s].b)),
  ...ORDER.slice(10).map((s) => c(`${s}-b`, 'uncommon', s, LOOKS[s].b)),
  ...ORDER.filter((s) => LOOKS[s].c).map((s) => c(`${s}-c`, 'uncommon', s, LOOKS[s].c!)),
  ...ORDER.map((s) => c(`${s}-rare`, 'rare', s, LOOKS[s].rare)),
  ...EPIC_PICKS.map(([s, fx]) => {
    const e = ELEMENTS[fx];
    return c(`${s}-epic`, 'epic', s, L(`${e.name} ${LOOKS[s].name}`, e.body, e.accent, e.detail, { fx }));
  }),
  ...LEGENDARY_PICKS.map((s) => {
    const fx = EPIC_PICKS.find(([x]) => x === s)![1];
    const e = ELEMENTS[fx];
    return c(`${s}-legendary`, 'legendary', s, L(`Golden ${e.name} ${LOOKS[s].name}`, '#f2c13a', softTint(e.accent === '#fff2a8' ? e.jewel : e.accent), '#fff2a8', { fx }), e.jewel);
  }),
  ...MYTHICS,
];

export const findCritter = (key: string) => CRITTERS.find((x) => x.key === key);
