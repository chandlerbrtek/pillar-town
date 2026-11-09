import { describe, expect, it } from 'vitest';
import { deriveTown, SEEDS, targetFor } from './town';
import type { AppData, Log, Pillar, YardItem } from './types';

let n = 0;
const log = (pillar: Pillar, day: string): Log => ({
  id: `log-${n++}`,
  habitId: null,
  pillar,
  day,
  createdAt: `${day}T12:00:00Z`,
});

// 2026-11-02 and 2026-11-09 are Mondays.
const base = (logs: Log[], startedOn = '2026-11-02', yard: YardItem[] = []): AppData => ({
  startedOn,
  habits: [],
  logs,
  yard,
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
  it('marks a full week and finds the weakest pillar', () => {
    const logs = ['03', '04', '05'].map((d) => log('vitality', `2026-11-${d}`));
    let town = deriveTown(base(logs), '2026-11-06');
    expect(town.weakest).toBe('mind');
    expect(town.weeks[0].fullWeek).toBe(false);
    town = deriveTown(base([...logs, log('mind', '2026-11-06')]), '2026-11-06');
    expect(town.weeks[0].fullWeek).toBe(true);
    expect(town.weakest).toBeNull();
  });

  it('breaks each week into days with counts per pillar', () => {
    const logs = [log('mind', '2026-11-03'), log('mind', '2026-11-03'), log('vitality', '2026-11-03'), log('heart', '2026-11-04')];
    const town = deriveTown(base(logs), '2026-11-04');
    const [mon, tue, wed, thu] = town.weeks[0].days;
    expect(mon.day).toBe('2026-11-02');
    expect(tue.counts.mind).toBe(2);
    expect(tue.counts.vitality).toBe(1);
    expect(tue.pillarsTouched).toBe(2);
    expect(wed.counts.heart).toBe(1);
    expect(thu.active).toBe(false);
  });

  it('lights the lamp on a day with 5 or more pillars', () => {
    const pillars: Pillar[] = ['mind', 'vitality', 'heart', 'spirit', 'bond'];
    const town = deriveTown(base(pillars.map((p) => log(p, '2026-11-03'))), '2026-11-04');
    expect(town.weeks[0].days[1].balanced).toBe(true);
    expect(town.weeks[0].days[2].balanced).toBe(false);
  });
});

describe('seeds', () => {
  it('earns per habit plus a bonus for each new building', () => {
    // 2 Mind habits and 1 Heart habit on one day: 3 habits, 2 buildings.
    const logs = [log('mind', '2026-11-03'), log('mind', '2026-11-03'), log('heart', '2026-11-03')];
    expect(deriveTown(base(logs), '2026-11-03').seeds.earned).toBe(3 * SEEDS.perHabit + 2 * SEEDS.newBuilding);
  });

  it('adds lamp and full week bonuses', () => {
    const pillars: Pillar[] = ['mind', 'heart', 'spirit', 'bond', 'craft'];
    const logs = [...pillars.map((p) => log(p, '2026-11-03')), ...['03', '04', '05'].map((d) => log('vitality', `2026-11-${d}`))];
    const town = deriveTown(base(logs), '2026-11-05');
    // 8 habits; buildings: 6 on Tue, 1 Wed, 1 Thu; one lamp; one full week.
    expect(town.seeds.earned).toBe(8 + 8 + SEEDS.lamp + SEEDS.fullWeek);
  });

  it('subtracts what was spent on the yard', () => {
    const yard: YardItem[] = [{ id: 'y1', weekStart: '2026-11-02', cell: 0, decor: 'bench', price: 3, createdAt: '' }];
    const town = deriveTown(base([log('mind', '2026-11-03')], '2026-11-02', yard), '2026-11-03');
    expect(town.seeds).toEqual({ earned: 2, spent: 3, balance: -1 });
  });
});

describe('streaks', () => {
  it('counts days in a row and resets after a missed day', () => {
    const logs = ['02', '03', '04', '06', '07'].map((d) => log('mind', `2026-11-${d}`));
    expect(deriveTown(base(logs), '2026-11-07').streaks.mind).toBe(2);
  });

  it('keeps a streak alive until today ends', () => {
    const logs = ['02', '03', '04'].map((d) => log('mind', `2026-11-${d}`));
    expect(deriveTown(base(logs), '2026-11-05').streaks.mind).toBe(3);
    expect(deriveTown(base(logs), '2026-11-06').streaks.mind).toBe(0);
  });

  it('pays a bonus when a streak reaches 7 days', () => {
    const days = ['02', '03', '04', '05', '06', '07', '08'];
    const logs = days.map((d) => log('heart', `2026-11-${d}`));
    const town = deriveTown(base(logs), '2026-11-08');
    expect(town.streaks.heart).toBe(7);
    expect(town.seeds.earned).toBe(7 * 2 + SEEDS.streakMilestones[0][1]);
  });
});
