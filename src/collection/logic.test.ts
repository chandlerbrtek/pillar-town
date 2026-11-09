import { describe, expect, it } from 'vitest';
import { deriveTown } from '../town';
import type { AppData, CapsulePull, Log, Pillar } from '../types';
import { deriveCollection, GLIMMER_GAIN, PITY, rollRarity } from './logic';
import { CRITTERS, RARITIES } from './roster';

const pull = (critter: string, source: CapsulePull['source'] = 'seeds', i = 0, glimmer = 0): CapsulePull => ({
  id: `p${i}`,
  critter,
  source,
  seeds: source === 'seeds' ? 10 : 0,
  glimmer,
  createdAt: `2026-11-03T00:00:${String(i).padStart(2, '0')}Z`,
});

const data = (pulls: CapsulePull[], logs: Log[] = []): AppData => ({ startedOn: '2026-11-02', habits: [], logs, targets: [], yard: [], pulls });
const of = (rarity: string) => CRITTERS.find((c) => c.rarity === rarity)!.key;

describe('roster', () => {
  it('has the pyramid of 30 / 25 / 20 / 12 / 8 / 4 with unique keys', () => {
    const counts = RARITIES.map((r) => CRITTERS.filter((c) => c.rarity === r).length);
    expect(counts).toEqual([30, 25, 20, 12, 8, 4]);
    expect(new Set(CRITTERS.map((c) => c.key)).size).toBe(CRITTERS.length);
  });
});

describe('collection', () => {
  it('turns duplicates into glimmer and subtracts wishes', () => {
    const c = of('rare');
    const d = data([pull(c, 'seeds', 1), pull(c, 'seeds', 2), pull(of('epic'), 'wish', 3, 3)]);
    const s = deriveCollection(d, deriveTown(d, '2026-11-03'));
    expect(s.owned.get(c)).toBe(2);
    expect(s.glimmer).toBe(GLIMMER_GAIN.rare - 3);
  });

  it('counts spins since the last legendary and mythic, ignoring wishes', () => {
    const d = data([pull(of('common'), 'seeds', 1), pull(of('legendary'), 'seeds', 2), pull(of('common'), 'seeds', 3), pull(of('common'), 'wish', 4)]);
    const s = deriveCollection(d, deriveTown(d, '2026-11-03'));
    expect(s.sinceLegendary).toBe(1);
    expect(s.sinceMythic).toBe(3);
  });

  it('earns a free capsule for each lit lamp and spends one per lamp pull', () => {
    const pillars: Pillar[] = ['mind', 'vitality', 'heart', 'spirit', 'bond'];
    const logs = pillars.map((p, i): Log => ({ id: `l${i}`, habitId: null, pillar: p, day: '2026-11-03', createdAt: '2026-11-03T10:00:00Z' }));
    const d = data([], logs);
    expect(deriveCollection(d, deriveTown(d, '2026-11-03')).lampTokens).toBe(1);
    const used = data([pull(of('common'), 'lamp', 1)], logs);
    expect(deriveCollection(used, deriveTown(used, '2026-11-03')).lampTokens).toBe(0);
  });

  it('guarantees a legendary or better, then a mythic, when pity runs out', () => {
    expect(rollRarity({ sinceLegendary: PITY.legendary - 1, sinceMythic: 0 }, 'seeds', () => 0.99)).toBe('legendary');
    expect(rollRarity({ sinceLegendary: 0, sinceMythic: PITY.mythic - 1 }, 'seeds', () => 0.99)).toBe('mythic');
    expect(rollRarity({ sinceLegendary: 0, sinceMythic: 0 }, 'golden', () => 0)).toBe('uncommon');
  });
});
