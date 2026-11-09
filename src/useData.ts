import { useCallback, useEffect, useState } from 'react';
import { today, weekStart } from './dates';
import { mergeTargets, type Store } from './store';
import { targetFor } from './town';
import type { AppData, CapsulePull, Habit, Log, Pillar, Size, TargetRow, YardItem } from './types';

/** A habit as chosen in onboarding or the Habits tab, before it has an id. */
export type NewHabit = Pick<Habit, 'name' | 'pillar' | 'small' | 'usual' | 'big'>;
/** The weekly target a pillar gets when its first habit is added: most days, not every day. */
export const STARTING_TARGET = 4;

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

/**
 * Loads the app's data and exposes actions. Each action updates the screen first,
 * then saves; if saving fails, the error is shown and the data is reloaded.
 */
export function useData(store: Store) {
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setData(await store.load());
    } catch (e) {
      setError(`Couldn't load your town: ${(e as Error).message}`);
    }
  }, [store]);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(
    async (apply: (d: AppData) => AppData, persist: () => Promise<void>) => {
      setData((d) => (d ? apply(d) : d));
      try {
        await persist();
      } catch (e) {
        setError(`Couldn't save: ${(e as Error).message}`);
        reload();
      }
    },
    [reload],
  );

  const actions = {
    async start(starters: NewHabit[], targets: Record<Pillar, number>) {
      const day = today();
      const habits: Habit[] = starters.map((s) => ({ id: uuid(), ...s, archived: false, createdAt: now() }));
      const rows: TargetRow[] = Object.entries(targets).map(([pillar, target]) => ({
        pillar: pillar as Pillar,
        weekStart: weekStart(day),
        target,
      }));
      try {
        await store.upsertHabits(habits);
        await store.upsertTargets(rows);
        await store.setStartedOn(day);
        setData((d) => ({ ...(d as AppData), startedOn: day, habits, targets: rows }));
      } catch (e) {
        setError(`Couldn't found your town: ${(e as Error).message}`);
      }
    },

    logHabit(habit: Habit, day: string, size: Size = 'usual'): Log {
      const log: Log = { id: uuid(), habitId: habit.id, pillar: habit.pillar, day, createdAt: now(), size };
      save((d) => ({ ...d, logs: [...d.logs, log] }), () => store.addLog(log));
      return log;
    },

    setLogSize(id: string, size: Size) {
      save((d) => ({ ...d, logs: d.logs.map((l) => (l.id === id ? { ...l, size } : l)) }), () => store.setLogSize(id, size));
    },

    removeLog(id: string) {
      save((d) => ({ ...d, logs: d.logs.filter((l) => l.id !== id) }), () => store.deleteLog(id));
    },

    saveHabit(habit: Habit) {
      save(
        (d) => ({ ...d, habits: [...d.habits.filter((h) => h.id !== habit.id), habit] }),
        () => store.upsertHabits([habit]),
      );
    },

    /** Adds a habit. A pillar's first habit gives it a starting weekly target. */
    addHabit(habit: NewHabit, current: AppData) {
      actions.saveHabit({ id: uuid(), ...habit, archived: false, createdAt: now() });
      if (targetFor(current.targets, habit.pillar, weekStart(today())) === 0) actions.setTarget(habit.pillar, STARTING_TARGET);
    },

    /** Places a decoration in a week's yard. */
    buyDecor(weekStart: string, cell: number, decor: string, price: number) {
      const item: YardItem = { id: uuid(), weekStart, cell, decor, price, createdAt: now() };
      save((d) => ({ ...d, yard: [...d.yard, item] }), () => store.addYardItem(item));
    },

    /** Records a capsule opened or a wish granted. */
    addPull(pull: Omit<CapsulePull, 'id' | 'createdAt'>): CapsulePull {
      const full: CapsulePull = { ...pull, id: uuid(), createdAt: now() };
      save((d) => ({ ...d, pulls: [...d.pulls, full] }), () => store.addPull(full));
      return full;
    },

    /** Removes a decoration; its seeds come back. */
    removeDecor(id: string) {
      save((d) => ({ ...d, yard: d.yard.filter((y) => y.id !== id) }), () => store.deleteYardItem(id));
    },

    /** Changes a target from this week on. Past weeks keep the target they had. */
    setTarget(pillar: Pillar, target: number) {
      const row: TargetRow = { pillar, weekStart: weekStart(today()), target };
      save((d) => ({ ...d, targets: mergeTargets(d.targets, [row]) }), () => store.upsertTargets([row]));
    },
  };

  return { data, error, clearError: () => setError(null), actions };
}

export type Actions = ReturnType<typeof useData>['actions'];
