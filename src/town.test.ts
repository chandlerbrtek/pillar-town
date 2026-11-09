import { describe, expect, it } from 'vitest';
import { deriveTown, lampNeed, oncePerDay, SEEDS, WEEKLY_TARGET } from './town';
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
  pulls: [],
  targets: [
    { pillar: 'vitality', weekStart: '2026-11-02', target: 3 },
    { pillar: 'mind', weekStart: '2026-11-02', target: 1 },
  ],
});

/** Adds habits in these pillars, from before the town started, which gives each a weekly target. */
const habitsIn = (data: AppData, pillars: Pillar[]): AppData => ({
  ...data,
  habits: pillars.map((p) => ({ id: `h-${p}`, name: p, pillar: p, archived: false, createdAt: '2026-11-01T08:00:00' })),
});
const days = (pillar: Pillar, ds: string[]) => ds.map((d) => log(pillar, `2026-11-${d}`));

describe('deriveTown', () => {
  it(`gives each pillar with a habit a target of ${WEEKLY_TARGET} days, and marks a full week`, () => {
    const vitality = days('vitality', ['02', '03', '04', '05', '06']);
    const mind = days('mind', ['02', '03', '04', '05']);
    let town = deriveTown(habitsIn(base([...vitality, ...mind]), ['vitality', 'mind']), '2026-11-08');
    expect(town.weeks[0].progress.vitality.target).toBe(WEEKLY_TARGET);
    expect(town.weeks[0].progress.heart.target).toBe(0);
    expect(town.weakest).toBe('mind');
    expect(town.weeks[0].fullWeek).toBe(false);
    town = deriveTown(habitsIn(base([...vitality, ...mind, log('mind', '2026-11-07')]), ['vitality', 'mind']), '2026-11-08');
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
    // One habit, in Vitality: the lamp needs just that pillar, and 5 days make a full week.
    const logs = days('vitality', ['02', '03', '04', '05', '06']);
    const town = deriveTown(habitsIn(base(logs), ['vitality']), '2026-11-06');
    expect(town.seeds.earned).toBe(5 + 5 + 5 * SEEDS.lamp + SEEDS.fullWeek);
  });

  it('subtracts what was spent on the yard', () => {
    const yard: YardItem[] = [{ id: 'y1', weekStart: '2026-11-02', cell: 0, decor: 'bench', price: 3, createdAt: '' }];
    const town = deriveTown(base([log('mind', '2026-11-03')], '2026-11-02', yard), '2026-11-03');
    expect(town.seeds).toEqual({ earned: 2, spent: 3, balance: -1 });
  });
});

describe('streaks', () => {
  it('survives one missed day and ends after two in a row', () => {
    // Missed the 5th only: the streak bends but keeps going (5 days touched).
    const bent = ['02', '03', '04', '06', '07'].map((d) => log('mind', `2026-11-${d}`));
    expect(deriveTown(base(bent), '2026-11-07').streaks.mind).toBe(5);
    // Missed the 5th and 6th: it ends, and the 7th starts a new one.
    const broken = ['02', '03', '04', '07'].map((d) => log('mind', `2026-11-${d}`));
    expect(deriveTown(base(broken), '2026-11-07').streaks.mind).toBe(1);
  });

  it('marks a streak bent after one missed day, until today is logged', () => {
    const logs = ['02', '03', '04'].map((d) => log('mind', `2026-11-${d}`));
    const town = deriveTown(base(logs), '2026-11-06');
    expect(town.streaks.mind).toBe(3);
    expect(town.bent.mind).toBe(true);
    expect(deriveTown(base(logs), '2026-11-05').bent.mind).toBe(false);
    expect(deriveTown(base(logs), '2026-11-07').streaks.mind).toBe(0);
  });

  it('pays a bonus when a streak reaches 7 days', () => {
    const days = ['02', '03', '04', '05', '06', '07', '08'];
    const logs = days.map((d) => log('heart', `2026-11-${d}`));
    const town = deriveTown(base(logs), '2026-11-08');
    expect(town.streaks.heart).toBe(7);
    expect(town.seeds.earned).toBe(7 * 2 + SEEDS.streakMilestones[0][1]);
  });
});

describe('habit sizes and the lamp', () => {
  const habit = (id: string, pillar: Pillar) => ({ id, name: id, pillar, archived: false, createdAt: '2026-11-02T08:00:00' });

  it('needs every pillar up to 3, then most of them, ending at 5 of 8', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(lampNeed)).toEqual([1, 2, 3, 3, 3, 4, 5, 5]);
  });

  it('lights the lamp when all of a 3-pillar day is done, at any size', () => {
    const habits = [habit('a', 'mind'), habit('b', 'heart'), habit('c', 'bond')];
    const logs = (['mind', 'heart', 'bond'] as Pillar[]).map((p) => ({ ...log(p, '2026-11-02'), size: 'small' as const }));
    const day = deriveTown({ ...base(logs), habits }, '2026-11-02').weeks[0].days[0];
    expect(day.lampNeed).toBe(3);
    expect(day.balanced).toBe(true);
  });

  it('gives Big a bonus seed and counts targets in days', () => {
    const logs = [log('mind', '2026-11-02'), { ...log('mind', '2026-11-02'), size: 'big' as const }];
    const town = deriveTown(base(logs), '2026-11-02');
    expect(town.weeks[0].progress.mind.count).toBe(1);
    expect(town.seeds.earned).toBe(2 * SEEDS.perHabit + SEEDS.newBuilding + SEEDS.bigBonus);
  });
});

describe('once a day, pennants and the fountain', () => {
  const withHabit = (pillar: Pillar, day: string, size: 'small' | 'usual' | 'big' = 'usual'): Log => ({ ...log(pillar, day), habitId: `h-${pillar}`, size });

  it('counts each habit once per day, keeping its biggest size', () => {
    const logs = [withHabit('mind', '2026-11-02'), withHabit('mind', '2026-11-02', 'big'), withHabit('mind', '2026-11-02')];
    expect(oncePerDay(logs)).toHaveLength(1);
    const day = deriveTown(base(logs), '2026-11-02').weeks[0].days[0];
    expect(day.counts.mind).toBe(1);
    expect(day.big.mind).toBe(true);
  });

  it('trickles once every pillar is past halfway, and flows on a full week', () => {
    // Habits in Vitality and Mind: each needs 3 days to trickle, 5 to flow.
    const town = (logs: Log[]) => deriveTown(habitsIn(base(logs), ['vitality', 'mind']), '2026-11-08').weeks[0].fountain;
    const vitality = days('vitality', ['02', '03', '04', '05', '06']);
    // One pillar can't carry the other.
    expect(town([...vitality, ...days('mind', ['02', '03'])])).toBe(0);
    expect(town([...vitality, ...days('mind', ['02', '03', '04'])])).toBe(1);
    expect(town([...vitality, ...days('mind', ['02', '03', '04', '05', '06'])])).toBe(2);
  });
});
