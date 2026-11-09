import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Store } from './store';
import type { AppData, CapsulePull, Habit, Log, Pillar, PullSource, TargetRow, YardItem, Size } from './types';

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
    const [settings, habits, logs, targets, yard, pulls] = await Promise.all([
      this.db.from('settings').select('started_on').maybeSingle(),
      this.db.from('habits').select('*').order('created_at'),
      this.db.from('logs').select('*').order('created_at'),
      this.db.from('targets').select('*'),
      this.db.from('yard_items').select('*').order('created_at'),
      this.db.from('capsule_pulls').select('*').order('created_at'),
    ]);
    return {
      startedOn: check(settings)?.started_on ?? null,
      habits: (check(habits) ?? []).map((h) => ({
        id: h.id,
        name: h.name,
        pillar: h.pillar as Pillar,
        archived: h.archived,
        createdAt: h.created_at,
        small: h.small ?? undefined,
        usual: h.usual ?? undefined,
        big: h.big ?? undefined,
      })),
      logs: (check(logs) ?? []).map((l) => ({
        id: l.id,
        habitId: l.habit_id,
        pillar: l.pillar as Pillar,
        day: l.day,
        createdAt: l.created_at,
        size: (l.size ?? 'usual') as Size,
      })),
      targets: (check(targets) ?? []).map((t) => ({
        pillar: t.pillar as Pillar,
        weekStart: t.week_start,
        target: t.target,
      })),
      // The yard table was added later; if it doesn't exist yet the town still loads, with empty yards.
      yard: (yard.error ? [] : (yard.data ?? [])).map((y) => ({
        id: y.id,
        weekStart: y.week_start,
        cell: y.cell,
        decor: y.decor,
        price: y.price,
        createdAt: y.created_at,
      })),
      // Added later too: without the table, the collection starts empty.
      pulls: (pulls.error ? [] : (pulls.data ?? [])).map((p) => ({
        id: p.id,
        critter: p.critter,
        source: p.source as PullSource,
        seeds: p.seeds,
        glimmer: p.glimmer,
        createdAt: p.created_at,
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
          small: h.small ?? null,
          usual: h.usual ?? null,
          big: h.big ?? null,
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
        size: log.size ?? 'usual',
      }),
    );
  }

  async deleteLog(id: string) {
    check(await this.db.from('logs').delete().eq('id', id));
  }

  async setLogSize(id: string, size: Size) {
    check(await this.db.from('logs').update({ size }).eq('id', id));
  }

  async addYardItem(item: YardItem) {
    check(
      await this.db.from('yard_items').insert({
        id: item.id,
        user_id: this.userId,
        week_start: item.weekStart,
        cell: item.cell,
        decor: item.decor,
        price: item.price,
        created_at: item.createdAt,
      }),
    );
  }

  async deleteYardItem(id: string) {
    check(await this.db.from('yard_items').delete().eq('id', id));
  }

  async addPull(pull: CapsulePull) {
    check(
      await this.db.from('capsule_pulls').insert({
        id: pull.id,
        user_id: this.userId,
        critter: pull.critter,
        source: pull.source,
        seeds: pull.seeds,
        glimmer: pull.glimmer,
        created_at: pull.createdAt,
      }),
    );
  }

  async upsertTargets(rows: TargetRow[]) {
    check(
      await this.db.from('targets').upsert(
        rows.map((r) => ({ user_id: this.userId, pillar: r.pillar, week_start: r.weekStart, target: r.target })),
      ),
    );
  }
}
