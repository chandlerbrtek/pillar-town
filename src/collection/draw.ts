// Draws critters into the town renderer: shape, crown, effects, pedestal and a mythic's still aura.
import { BASE_FLAG, type Renderer } from '../iso/engine';
import { drawCrown, drawFx, drawPedestal, SHAPES, type Look } from './art';
import { MYTHIC_SHAPES, type Critter } from './roster';

const SIL: Look = { name: '', body: '#2a2342', accent: '#2a2342', detail: '#2a2342' };
const RAINBOW = ['#ff7ad9', '#ffb03a', '#fff2a8', '#7cf0a0', '#7ae8ff', '#b07aff'];

/** `baseOnly` draws just the pedestal, as the ground under a hopping critter. */
export function drawCritter(r: Renderer, critter: Critter, gx: number, gy: number, opts: { silhouette?: boolean; pedestal?: boolean; baseOnly?: boolean } = {}) {
  const { silhouette = false, pedestal = false, baseOnly = false } = opts;
  if (pedestal && !silhouette && (critter.rarity === 'legendary' || critter.rarity === 'mythic')) {
    r.objFlag = BASE_FLAG;
    drawPedestal(r, gx, gy, critter.rarity === 'legendary' ? 'gold' : 'crystal');
    r.objFlag = 0;
  }
  if (baseOnly) return;
  const shape = SHAPES[critter.shape] ?? MYTHIC_SHAPES[critter.shape];
  shape(r, gx, gy, silhouette ? SIL : critter.look);
  if (!silhouette && critter.rarity === 'legendary') drawCrown(r, critter.jewel ?? '#e8403a');
  r.commit();
  if (silhouette) return;
  if (critter.look.fx) drawFx(r, critter.look.fx, gx, gy);
  if (critter.rarity === 'legendary' || critter.rarity === 'mythic') {
    for (const [x, y, z] of [[0.14, 0.32, 0.62], [0.86, 0.4, 0.5], [0.3, 0.88, 0.8], [0.82, 0.82, 0.3]]) r.dot(gx + x, gy + y, z, '#ffffff', 2);
    if (critter.rarity === 'mythic') RAINBOW.forEach((c, i) => {
      const a = (i / RAINBOW.length) * Math.PI * 2;
      r.dot(gx + 0.5 + Math.cos(a) * 0.42, gy + 0.5 + Math.sin(a) * 0.42, 0.35 + (i % 3) * 0.15, c, 2);
    });
    r.commit();
  }
}
