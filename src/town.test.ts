import { describe, expect, it } from 'vitest';
import { deriveTown, targetFor } from './town';
import type { AppData, Log, Pillar } from './types';

let n = 0;
const log = (pillar: Pillar, day: string): Log => ({
  id: `log-${n++}`,
  habitId: null,
  pillar,
  day,
  createdAt: `${day}T12:00:00Z`,
});

// 2026-11-02 and 2026-11-09 are Mondays.
const base = (logs: Log[], startedOn = '2026-11-02'): AppData => ({
  startedOn,
  habits: [],
  logs,
  targets: [
    { pillar: 'vitality', weekStart: '2026-11-02', target: 3 },
    { pillar: 'mind', weekStart: '2026-11-02', target: 1 },
  ],
});

describe('targetFor', () => {
  it('uses the latest row in effect for that week', () => {
    const targets = [
      { pillar: 'mind' as const, weekStart: '2026-11-02', target: 1 },
      { pillar: 'mind' as const, weekStart: '2026-11-16', target: 4 },
    ];
    expect(targetFor(targets, 'mind', '2026-11-09')).toBe(1);
    expect(targetFor(targets, 'mind', '2026-11-16')).toBe(4);
    expect(targetFor(targets, 'mind', '2026-10-26')).toBe(0);
    expect(targetFor(targets, 'heart', '2026-11-16')).toBe(0);
  });
});

describe('deriveTown', () => {
  it('places one building per log and no wilting in the current week', () => {
    const town = deriveTown(base([log('vitality', '2026-11-03')]), '2026-11-05');
    expect(town.weeks).toHaveLength(1);
    expect(town.weeks[0].buildings).toHaveLength(1);
    expect(town.weeks[0].wilted).toHaveLength(0);
  });

  it('wilts the shortfall of a finished week', () => {
    const town = deriveTown(base([log('vitality', '2026-11-03')]), '2026-11-10');
    const [first] = town.weeks;
    expect(first.wilted.filter((w) => w.pillar === 'vitality')).toHaveLength(2);
    expect(first.wilted.filter((w) => w.pillar === 'mind')).toHaveLength(1);
    expect(town.openWilted.vitality).toBe(2);
  });

  it('restores the oldest wilted spots with extra habits in a later week', () => {
    const logs = [
      log('vitality', '2026-11-03'),
      // Next week: 5 vitality against a target of 3 = 2 extra.
      ...['10', '11', '12', '13', '14'].map((d) => log('vitality', `2026-11-${d}`)),
    ];
    const town = deriveTown(base(logs), '2026-11-15');
    expect(town.openWilted.vitality).toBe(0);
    expect(town.weeks[0].wilted.filter((w) => w.pillar === 'vitality').every((w) => w.restoredIn === '2026-11-09')).toBe(true);
    expect(town.openWilted.mind).toBe(1);
  });

  it('does not wilt a partial first week', () => {
    const town = deriveTown(base([], '2026-11-06'), '2026-11-10');
    expect(town.weeks[0].isWarmup).toBe(true);
    expect(town.weeks[0].wilted).toHaveLength(0);
  });

  it('marks a full week and finds the weakest pillar', () => {
    const logs = ['03', '04', '05'].map((d) => log('vitality', `2026-11-${d}`));
    let town = deriveTown(base(logs), '2026-11-06');
    expect(town.weakest).toBe('mind');
    expect(town.weeks[0].fullWeek).toBe(false);
    town = deriveTown(base([...logs, log('mind', '2026-11-06')]), '2026-11-06');
    expect(town.weeks[0].fullWeek).toBe(true);
    expect(town.weakest).toBeNull();
  });
});
