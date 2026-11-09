// The capsule machine's rules: odds, pity, glimmer, wishes and free capsules.
// Everything here is worked out from the stored pulls, so nothing else needs saving.
import type { Town } from '../town';
import type { AppData, PullSource } from '../types';
import { CRITTERS, RARITIES, type Critter, type Rarity } from './roster';

export const SPIN_COST = 10;
export const RATES: Record<Rarity, number> = { common: 0.55, uncommon: 0.25, rare: 0.12, epic: 0.064, legendary: 0.012, mythic: 0.004 };
/** Golden capsules (earned with a full week) skip commons and favor the rarer tiers. */
export const GOLDEN_RATES: Record<Rarity, number> = { common: 0, uncommon: 0.4, rare: 0.32, epic: 0.2, legendary: 0.065, mythic: 0.015 };
export const GLIMMER_GAIN: Record<Rarity, number> = { common: 1, uncommon: 2, rare: 4, epic: 10, legendary: 25, mythic: 60 };
export const WISH_COST: Record<Rarity, number> = { common: 10, uncommon: 20, rare: 40, epic: 100, legendary: 250, mythic: 600 };
/** Spins without one before a legendary-or-better, or a mythic, is guaranteed. */
export const PITY = { legendary: 50, mythic: 200 };

export interface CollectionState {
  /** Copies found of each critter. */
  owned: Map<string, number>;
  glimmer: number;
  sinceLegendary: number;
  sinceMythic: number;
  /** Free capsules from lit lamps, and golden capsules from full weeks, not yet opened. */
  lampTokens: number;
  goldenTokens: number;
}

export function deriveCollection(data: AppData, town: Town): CollectionState {
  const owned = new Map<string, number>();
  let glimmer = 0, sinceLegendary = 0, sinceMythic = 0, lampUsed = 0, goldenUsed = 0;
  const byKey = new Map(CRITTERS.map((c) => [c.key, c]));
  const pulls = [...data.pulls].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const p of pulls) {
    const critter = byKey.get(p.critter);
    if (!critter) continue;
    const had = owned.get(p.critter) ?? 0;
    owned.set(p.critter, had + 1);
    if (had > 0) glimmer += GLIMMER_GAIN[critter.rarity];
    glimmer -= p.glimmer;
    if (p.source === 'lamp') lampUsed++;
    if (p.source === 'golden') goldenUsed++;
    if (p.source === 'wish') continue;
    sinceLegendary++;
    sinceMythic++;
    if (critter.rarity === 'legendary' || critter.rarity === 'mythic') sinceLegendary = 0;
    if (critter.rarity === 'mythic') sinceMythic = 0;
  }
  const litDays = town.weeks.reduce((n, w) => n + w.days.filter((d) => d.active && d.balanced).length, 0);
  const fullWeeks = town.weeks.filter((w) => w.fullWeek).length;
  return {
    owned,
    glimmer: Math.max(0, glimmer),
    sinceLegendary,
    sinceMythic,
    lampTokens: Math.max(0, litDays - lampUsed),
    goldenTokens: Math.max(0, fullWeeks - goldenUsed),
  };
}

/** Picks the rarity for the next capsule, honoring the pity counters. */
export function rollRarity(state: Pick<CollectionState, 'sinceLegendary' | 'sinceMythic'>, source: Exclude<PullSource, 'wish'>, rng = Math.random): Rarity {
  // The counters count past spins; this spin would be the next one.
  if (state.sinceMythic + 1 >= PITY.mythic) return 'mythic';
  const rates = source === 'golden' ? GOLDEN_RATES : RATES;
  if (state.sinceLegendary + 1 >= PITY.legendary) return rng() < rates.mythic / (rates.mythic + rates.legendary) ? 'mythic' : 'legendary';
  let x = rng();
  for (const r of RARITIES) {
    if (x < rates[r]) return r;
    x -= rates[r];
  }
  return 'common';
}

export function rollCritter(state: CollectionState, source: Exclude<PullSource, 'wish'>, rng = Math.random): Critter {
  const rarity = rollRarity(state, source, rng);
  const pool = CRITTERS.filter((c) => c.rarity === rarity);
  return pool[Math.floor(rng() * pool.length)];
}

export const isNew = (state: CollectionState, critter: Critter) => !state.owned.has(critter.key);
