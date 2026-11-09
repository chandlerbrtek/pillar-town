import { addDays, toDay, weekStart } from './dates';
import { PILLARS, type AppData, type Log, type Pillar, type Size, type TargetRow } from './types';

const SIZE_RANK: Record<Size, number> = { small: 0, usual: 1, big: 2 };

/**
 * Each habit counts once per day: repeat logs (from before logging was limited) collapse into
 * one, keeping the biggest size. Logs without a habit are kept as they are.
 */
export function oncePerDay(logs: Log[]): Log[] {
  const best = new Map<string, Log>();
  const loose: Log[] = [];
  for (const log of logs) {
    if (!log.habitId) {
      loose.push(log);
      continue;
    }
    const key = `${log.habitId}|${log.day}`;
    const prev = best.get(key);
    if (!prev || SIZE_RANK[log.size ?? 'usual'] > SIZE_RANK[prev.size ?? 'usual']) best.set(key, log);
  }
  return [...best.values(), ...loose];
}

/** The plaza fountain: dry, trickling once half the week's target days are done, flowing on a full week. */
export type FountainStage = 0 | 1 | 2;

export interface PillarProgress {
  count: number;
  target: number;
}

/**
 * How many pillars light a day's lamp, given how many pillars you have habits in.
 * All of them while you're starting out (up to 3), then most of them, ending at 5 of 8.
 */
export function lampNeed(pillarsWithHabits: number): number {
  const n = pillarsWithHabits;
  // Without habits (only possible in old data), keep the original 5 pillars.
  if (n <= 0) return 5;
  return Math.min(n, Math.max(3, Math.ceil(n * 0.6)));
}

/** How seeds are earned. */
export const SEEDS = {
  perHabit: 1,
  /** Extra for a habit logged at its Big size. */
  bigBonus: 1,
  newBuilding: 1,
  lamp: 5,
  fullWeek: 25,
  /** [streak length in days, bonus] */
  streakMilestones: [
    [7, 10],
    [30, 40],
    [100, 150],
  ] as [number, number][],
};

export interface DayBlock {
  day: string;
  /** False for days before the town started or after today. */
  active: boolean;
  /** Habits logged per pillar that day. */
  counts: Record<Pillar, number>;
  /** The habits behind each pillar's count, by name. */
  habits: Record<Pillar, { name: string; count: number }[]>;
  pillarsTouched: number;
  /** Pillars needed to light this day's lamp. */
  lampNeed: number;
  /** Pillars with a Big log that day, which fly a pennant. */
  big: Record<Pillar, boolean>;
  balanced: boolean;
}

export interface WeekBlock {
  weekStart: string;
  /** Monday to Sunday. */
  days: DayBlock[];
  isCurrent: boolean;
  progress: Record<Pillar, PillarProgress>;
  fullWeek: boolean;
  fountain: FountainStage;
}

export interface Town {
  /** Oldest first. */
  weeks: WeekBlock[];
  /** This week's furthest-behind pillar, or null when every target is met. */
  weakest: Pillar | null;
  /**
   * Days each pillar has been touched in its current streak. A streak survives one missed
   * day ("never miss twice") and only ends after two missed days in a row.
   */
  streaks: Record<Pillar, number>;
  /** True when yesterday was missed: one more missed day ends the streak. */
  bent: Record<Pillar, boolean>;
  seeds: { earned: number; spent: number; balance: number };
}

export function targetFor(targets: TargetRow[], pillar: Pillar, week: string): number {
  let best: TargetRow | null = null;
  for (const row of targets) {
    if (row.pillar !== pillar || row.weekStart > week) continue;
    if (!best || row.weekStart > best.weekStart) best = row;
  }
  return best?.target ?? 0;
}

/** A stable number from a string, used to pick a building's color variant. */
export function variantFor(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const perPillar = <T,>(make: (p: Pillar) => T) => Object.fromEntries(PILLARS.map((p) => [p, make(p)])) as Record<Pillar, T>;

export function isFullWeek(progress: Record<Pillar, PillarProgress>): boolean {
  const withTargets = PILLARS.filter((p) => progress[p].target > 0);
  return withTargets.length > 0 && withTargets.every((p) => progress[p].count >= progress[p].target);
}

export function fountainStage(progress: Record<Pillar, PillarProgress>): FountainStage {
  if (isFullWeek(progress)) return 2;
  let done = 0, needed = 0;
  for (const p of PILLARS) {
    const { count, target } = progress[p];
    if (target <= 0) continue;
    done += Math.min(count, target);
    needed += target;
  }
  return needed > 0 && done * 2 >= needed ? 1 : 0;
}

export function weakestPillar(progress: Record<Pillar, PillarProgress>): Pillar | null {
  let weakest: Pillar | null = null;
  let lowest = 1;
  for (const p of PILLARS) {
    const { count, target } = progress[p];
    if (target <= 0) continue;
    const ratio = count / target;
    if (ratio < lowest) {
      lowest = ratio;
      weakest = p;
    }
  }
  return weakest;
}

/**
 * Builds the whole town from raw data. Nothing here is stored: buildings, lamps,
 * fountains, streaks and seeds earned all come from the logs. Only seeds spent
 * come from stored yard decorations.
 */
export function deriveTown(data: AppData, todayDay: string): Town {
  const spent = data.yard.reduce((n, item) => n + item.price, 0) + data.pulls.reduce((n, p) => n + p.seeds, 0);
  const empty: Town = { weeks: [], weakest: null, streaks: perPillar(() => 0), bent: perPillar(() => false), seeds: { earned: 0, spent, balance: -spent } };
  if (!data.startedOn) return empty;

  const firstWeek = weekStart(data.startedOn);
  const currentWeek = weekStart(todayDay);
  const habitNames = new Map(data.habits.map((h) => [h.id, h.name]));
  // The day each current habit was added, for how many pillars count toward each day's lamp.
  const habitDays = data.habits.filter((h) => !h.archived).map((h) => ({ pillar: h.pillar, from: toDay(new Date(h.createdAt)) }));
  const pillarsOn = (day: string) => new Set(habitDays.filter((h) => h.from <= day).map((h) => h.pillar)).size;

  const allLogs = oncePerDay(data.logs);
  const logsByWeek = new Map<string, AppData['logs']>();
  for (const log of allLogs) {
    const w = weekStart(log.day);
    if (w < firstWeek || w > currentWeek) continue;
    if (!logsByWeek.has(w)) logsByWeek.set(w, []);
    logsByWeek.get(w)!.push(log);
  }

  const weeks: WeekBlock[] = [];
  for (let w = firstWeek; w <= currentWeek; w = addDays(w, 7)) {
    const logs = (logsByWeek.get(w) ?? []).slice().sort((a, b) => (a.day + a.createdAt).localeCompare(b.day + b.createdAt));
    const progress = perPillar<PillarProgress>(() => ({ count: 0, target: 0 }));
    for (const p of PILLARS) progress[p].target = targetFor(data.targets, p, w);
    // Targets count days: touching a pillar twice in one day still counts once.
    const daysTouched = perPillar<Set<string>>(() => new Set());
    for (const log of logs) daysTouched[log.pillar].add(log.day);
    for (const p of PILLARS) progress[p].count = daysTouched[p].size;

    const days: DayBlock[] = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(w, i);
      const counts = perPillar(() => 0);
      const named = perPillar<Map<string, number>>(() => new Map());
      const big = perPillar(() => false);
      for (const log of logs) {
        if (log.day !== day) continue;
        counts[log.pillar]++;
        if (log.size === 'big') big[log.pillar] = true;
        const name = (log.habitId && habitNames.get(log.habitId)) || 'A habit';
        named[log.pillar].set(name, (named[log.pillar].get(name) ?? 0) + 1);
      }
      const pillarsTouched = PILLARS.filter((p) => counts[p] > 0).length;
      const need = lampNeed(pillarsOn(day));
      days.push({
        day,
        active: day >= data.startedOn && day <= todayDay,
        counts,
        habits: Object.fromEntries(PILLARS.map((p) => [p, [...named[p]].map(([name, count]) => ({ name, count }))])) as DayBlock['habits'],
        pillarsTouched,
        lampNeed: need,
        big,
        balanced: pillarsTouched >= need,
      });
    }

    weeks.push({ weekStart: w, days, isCurrent: w === currentWeek, progress, fullWeek: isFullWeek(progress), fountain: fountainStage(progress) });
  }

  // Seeds from habits, Big sizes, new buildings, lamps and full weeks.
  let earned = 0;
  for (const log of allLogs) if (log.size === 'big' && log.day >= data.startedOn && log.day <= todayDay) earned += SEEDS.bigBonus;
  for (const week of weeks) {
    if (week.fullWeek) earned += SEEDS.fullWeek;
    for (const day of week.days) {
      if (!day.active) continue;
      for (const p of PILLARS) earned += day.counts[p] * SEEDS.perHabit;
      earned += day.pillarsTouched * SEEDS.newBuilding;
      if (day.balanced) earned += SEEDS.lamp;
    }
  }

  // Streaks, walking every day in order. One missed day bends a streak; a second in a row
  // ends it. Today hasn't been missed yet, so it never counts as a miss.
  const run = perPillar(() => 0);
  const missed = perPillar(() => 0);
  for (const week of weeks)
    for (const day of week.days) {
      if (!day.active) continue;
      for (const p of PILLARS) {
        if (day.counts[p] > 0) {
          run[p]++;
          missed[p] = 0;
          for (const [length, bonus] of SEEDS.streakMilestones) if (run[p] === length) earned += bonus;
        } else if (day.day < todayDay) {
          missed[p]++;
          if (missed[p] >= 2) run[p] = 0;
        }
      }
    }
  const bent = perPillar((p) => run[p] > 0 && missed[p] === 1);

  const current = weeks[weeks.length - 1];
  return {
    weeks,
    weakest: current ? weakestPillar(current.progress) : null,
    streaks: run,
    bent,
    seeds: { earned, spent, balance: earned - spent },
  };
}
