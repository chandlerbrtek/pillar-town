import { addDays, weekStart } from './dates';
import { PILLARS, type AppData, type Pillar, type TargetRow } from './types';

export interface Building {
  logId: string;
  pillar: Pillar;
  day: string;
  habitName: string;
  variant: number;
}

export interface WiltedSpot {
  id: string;
  pillar: Pillar;
  /** The week the habit was missed in. */
  week: string;
  /** The week a comeback restored it, or null while still wilted. */
  restoredIn: string | null;
}

export interface PillarProgress {
  count: number;
  target: number;
}

/** How many pillars in one day light that day's lamp. */
export const BALANCED_PILLARS = 5;

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
  /** The first week can be partial, so it never wilts. */
  isWarmup: boolean;
  buildings: Building[];
  wilted: WiltedSpot[];
  progress: Record<Pillar, PillarProgress>;
  fullWeek: boolean;
}

export interface Town {
  /** Oldest first. */
  weeks: WeekBlock[];
  openWilted: Record<Pillar, number>;
  /** This week's furthest-behind pillar, or null when every target is met. */
  weakest: Pillar | null;
}

export function targetFor(targets: TargetRow[], pillar: Pillar, week: string): number {
  let best: TargetRow | null = null;
  for (const row of targets) {
    if (row.pillar !== pillar || row.weekStart > week) continue;
    if (!best || row.weekStart > best.weekStart) best = row;
  }
  return best?.target ?? 0;
}

/** A stable number from a log id, used to pick a building's color variant. */
export function variantFor(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const perPillar = <T,>(make: () => T) =>
  Object.fromEntries(PILLARS.map((p) => [p, make()])) as Record<Pillar, T>;

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
 * Builds the whole town from raw data. Nothing about the town is stored:
 * buildings come from logs, and wilted spots come from missed weekly targets.
 *
 * - When a week ends, each pillar's shortfall (target minus logged) becomes wilted spots.
 * - Logging past a pillar's target in a later week restores that pillar's oldest wilted spots,
 *   one per extra habit. This happens live in the current week.
 */
export function deriveTown(data: AppData, todayDay: string): Town {
  const empty: Town = { weeks: [], openWilted: perPillar(() => 0), weakest: null };
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

  const queues = perPillar<WiltedSpot[]>(() => []);
  const weeks: WeekBlock[] = [];

  for (let w = firstWeek; w <= currentWeek; w = addDays(w, 7)) {
    const logs = (logsByWeek.get(w) ?? [])
      .slice()
      .sort((a, b) => (a.day + a.createdAt).localeCompare(b.day + b.createdAt));

    const progress = perPillar<PillarProgress>(() => ({ count: 0, target: 0 }));
    for (const p of PILLARS) progress[p].target = targetFor(data.targets, p, w);
    for (const log of logs) progress[log.pillar].count++;

    const isCurrent = w === currentWeek;
    const isWarmup = w === firstWeek && data.startedOn !== firstWeek;
    const wilted: WiltedSpot[] = [];

    for (const p of PILLARS) {
      const { count, target } = progress[p];
      // Extra habits restore older wilted spots, oldest first.
      let surplus = Math.max(0, count - target);
      const queue = queues[p];
      while (surplus > 0 && queue.length > 0) {
        queue.shift()!.restoredIn = w;
        surplus--;
      }
      // A finished week leaves its shortfall behind as wilted spots.
      if (!isCurrent && !isWarmup) {
        for (let i = 0; i < Math.max(0, target - count); i++) {
          const spot: WiltedSpot = { id: `${w}-${p}-${i}`, pillar: p, week: w, restoredIn: null };
          wilted.push(spot);
          queue.push(spot);
        }
      }
    }

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

    weeks.push({
      weekStart: w,
      days,
      isCurrent,
      isWarmup,
      buildings: logs.map((log) => ({
        logId: log.id,
        pillar: log.pillar,
        day: log.day,
        habitName: (log.habitId && habitNames.get(log.habitId)) || 'A habit',
        variant: variantFor(log.id),
      })),
      wilted,
      progress,
      fullWeek: isFullWeek(progress),
    });
  }

  const current = weeks[weeks.length - 1];
  return {
    weeks,
    openWilted: Object.fromEntries(PILLARS.map((p) => [p, queues[p].length])) as Record<Pillar, number>,
    weakest: current ? weakestPillar(current.progress) : null,
  };
}
