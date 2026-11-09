import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Store } from './store';
import type { AppData, Habit, Log, Pillar, TargetRow } from './types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** The Supabase client, or null when no project is configured (the app then saves locally). */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;

function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

/** Stores data in Supabase tables. Row level security limits each user to their own rows. */
export class SupabaseStore implements Store {
  kind = 'supabase' as const;

  constructor(
    private db: SupabaseClient,
    private userId: string,
  ) {}

  async load(): Promise<AppData> {
    const [settings, habits, logs, targets] = await Promise.all([
      this.db.from('settings').select('started_on').maybeSingle(),
      this.db.from('habits').select('*').order('created_at'),
      this.db.from('logs').select('*').order('created_at'),
      this.db.from('targets').select('*'),
    ]);
    return {
      startedOn: check(settings)?.started_on ?? null,
      habits: (check(habits) ?? []).map((h) => ({
        id: h.id,
        name: h.name,
        pillar: h.pillar as Pillar,
        archived: h.archived,
        createdAt: h.created_at,
      })),
      logs: (check(logs) ?? []).map((l) => ({
        id: l.id,
        habitId: l.habit_id,
        pillar: l.pillar as Pillar,
        day: l.day,
        createdAt: l.created_at,
      })),
      targets: (check(targets) ?? []).map((t) => ({
        pillar: t.pillar as Pillar,
        weekStart: t.week_start,
        target: t.target,
      })),
    };
  }

  async setStartedOn(day: string) {
    check(await this.db.from('settings').upsert({ user_id: this.userId, started_on: day }));
  }

  async upsertHabits(habits: Habit[]) {
    check(
      await this.db.from('habits').upsert(
        habits.map((h) => ({
          id: h.id,
          user_id: this.userId,
          name: h.name,
          pillar: h.pillar,
          archived: h.archived,
          created_at: h.createdAt,
        })),
      ),
    );
  }

  async addLog(log: Log) {
    check(
      await this.db.from('logs').insert({
        id: log.id,
        user_id: this.userId,
        habit_id: log.habitId,
        pillar: log.pillar,
        day: log.day,
        created_at: log.createdAt,
      }),
    );
  }

  async deleteLog(id: string) {
    check(await this.db.from('logs').delete().eq('id', id));
  }

  async upsertTargets(rows: TargetRow[]) {
    check(
      await this.db.from('targets').upsert(
        rows.map((r) => ({ user_id: this.userId, pillar: r.pillar, week_start: r.weekStart, target: r.target })),
      ),
    );
  }
}
