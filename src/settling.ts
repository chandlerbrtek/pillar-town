// New habits are "settling" until they've been logged on most days for a couple of weeks.
// Only a few can settle at once, so you never take on too much at the same time.
import { addDays } from './dates';
import type { AppData, Habit } from './types';

/** Logged on this many of any SETTLE_WINDOW days in a row, at any size, and a habit has settled. */
export const SETTLE_DAYS = 10;
export const SETTLE_WINDOW = 14;
/** How many habits may be settling at once. Strict: more waits on the Someday shelf. */
export const MAX_SETTLING = 3;

const daysLogged = (habit: Habit, data: AppData) => [...new Set(data.logs.filter((l) => l.habitId === habit.id).map((l) => l.day))].sort();

/** Settling is done once, for good: a rough week later doesn't undo it. */
export function isSettled(habit: Habit, data: AppData): boolean {
  const days = daysLogged(habit, data);
  for (let i = 0; i + SETTLE_DAYS - 1 < days.length; i++) {
    if (days[i + SETTLE_DAYS - 1] <= addDays(days[i], SETTLE_WINDOW - 1)) return true;
  }
  return false;
}

/** Days logged in the last SETTLE_WINDOW days, for the settling meter. */
export function recentDays(habit: Habit, data: AppData, today: string): number {
  const from = addDays(today, -(SETTLE_WINDOW - 1));
  return daysLogged(habit, data).filter((d) => d >= from && d <= today).length;
}

/** Active habits that haven't settled yet. */
export function settling(data: AppData): Habit[] {
  return data.habits.filter((h) => !h.archived && !isSettled(h, data));
}

export const hasRoom = (data: AppData) => settling(data).length < MAX_SETTLING;
