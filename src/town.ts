import { addDays, weekStart } from './dates';
import { PILLARS, type AppData, type Pillar, type TargetRow } from './types';

export interface PillarProgress {
  count: number;
  target: number;
}

/** How many pillars in one day light that day's lamp. */
export const BALANCED_PILLARS = 5;

/** How seeds are earned. */
export const SEEDS = {
  perHabit: 1,
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
  balanced: boolean;
}

export interface WeekBlock {
  weekStart: string;
  /** Monday to Sunday. */
  days: DayBlock[];
  isCurrent: boolean;
  progress: Record<Pillar, PillarProgress>;
  fullWeek: boolean;
}

export interface Town {
  /** Oldest first. */
  weeks: WeekBlock[];
  /** This week's furthest-behind pillar, or null when every target is met. */
  weakest: Pillar | null;
  /** Days in a row each pillar has been touched. Today counts until midnight. */
  streaks: Record<Pillar, number>;
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

const perPillar = <T,>(make: () => T) => Object.fromEntries(PILLARS.map((p) => [p, make()])) as Record<Pillar, T>;

export function isFullWeek(progress: Record<Pillar, PillarProgress>): boolean {
  const withTargets = PILLARS.filter((p) => progress[p].target > 0);
  return withTargets.length > 0 && withTargets.every((p) => progress[p].count >= progress[p].target);
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
  const spent = data.yard.reduce((n, item) => n + item.price, 0);
  const empty: Town = { weeks: [], weakest: null, streaks: perPillar(() => 0), seeds: { earned: 0, spent, balance: -spent } };
  if (!data.startedOn) return empty;

  const firstWeek = weekStart(data.startedOn);
  const currentWeek = weekStart(todayDay);
  const habitNames = new Map(data.habits.map((h) => [h.id, h.name]));

  const logsByWeek = new Map<string, AppData['logs']>();
  for (const log of data.logs) {
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
    for (const log of logs) progress[log.pillar].count++;

    const days: DayBlock[] = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(w, i);
      const counts = perPillar(() => 0);
      const named = perPillar<Map<string, number>>(() => new Map());
      for (const log of logs) {
        if (log.day !== day) continue;
        counts[log.pillar]++;
        const name = (log.habitId && habitNames.get(log.habitId)) || 'A habit';
        named[log.pillar].set(name, (named[log.pillar].get(name) ?? 0) + 1);
      }
      const pillarsTouched = PILLARS.filter((p) => counts[p] > 0).length;
      days.push({
        day,
        active: day >= data.startedOn && day <= todayDay,
        counts,
        habits: Object.fromEntries(PILLARS.map((p) => [p, [...named[p]].map(([name, count]) => ({ name, count }))])) as DayBlock['habits'],
        pillarsTouched,
        balanced: pillarsTouched >= BALANCED_PILLARS,
      });
    }

    weeks.push({ weekStart: w, days, isCurrent: w === currentWeek, progress, fullWeek: isFullWeek(progress) });
  }

  // Seeds from habits, new buildings, lamps and full weeks.
  let earned = 0;
  for (const week of weeks) {
    if (week.fullWeek) earned += SEEDS.fullWeek;
    for (const day of week.days) {
      if (!day.active) continue;
      for (const p of PILLARS) earned += day.counts[p] * SEEDS.perHabit;
      earned += day.pillarsTouched * SEEDS.newBuilding;
      if (day.balanced) earned += SEEDS.lamp;
    }
  }

  // Streaks, walking every day in order. A missed day resets a pillar's streak;
  // today hasn't been missed yet, so it never resets one.
  const run = perPillar(() => 0);
  for (const week of weeks)
    for (const day of week.days) {
      if (!day.active) continue;
      for (const p of PILLARS) {
        if (day.counts[p] > 0) {
          run[p]++;
          for (const [length, bonus] of SEEDS.streakMilestones) if (run[p] === length) earned += bonus;
        } else if (day.day < todayDay) run[p] = 0;
      }
    }

  const current = weeks[weeks.length - 1];
  return {
    weeks,
    weakest: current ? weakestPillar(current.progress) : null,
    streaks: run,
    seeds: { earned, spent, balance: earned - spent },
  };
}
