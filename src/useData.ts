import { useCallback, useEffect, useState } from 'react';
import { today, weekStart } from './dates';
import { mergeTargets, type Store } from './store';
import type { AppData, Habit, Log, Pillar, TargetRow } from './types';

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
    async start(starters: { name: string; pillar: Pillar }[], targets: Record<Pillar, number>) {
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

    logHabit(habit: Habit, day: string): Log {
      const log: Log = { id: uuid(), habitId: habit.id, pillar: habit.pillar, day, createdAt: now() };
      save((d) => ({ ...d, logs: [...d.logs, log] }), () => store.addLog(log));
      return log;
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

    addHabit(name: string, pillar: Pillar) {
      actions.saveHabit({ id: uuid(), name, pillar, archived: false, createdAt: now() });
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
