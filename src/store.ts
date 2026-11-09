import { EMPTY_DATA, type AppData, type CapsulePull, type Habit, type Log, type TargetRow, type YardItem } from './types';

/** Where the app's data lives. Every write is already applied on screen before it is called. */
export interface Store {
  kind: 'local' | 'supabase';
  load(): Promise<AppData>;
  setStartedOn(day: string): Promise<void>;
  upsertHabits(habits: Habit[]): Promise<void>;
  addLog(log: Log): Promise<void>;
  deleteLog(id: string): Promise<void>;
  upsertTargets(rows: TargetRow[]): Promise<void>;
  addYardItem(item: YardItem): Promise<void>;
  deleteYardItem(id: string): Promise<void>;
  addPull(pull: CapsulePull): Promise<void>;
}

const KEY = 'pillartown:v1';

/** Keeps everything in this browser's localStorage. */
export class LocalStore implements Store {
  kind = 'local' as const;

  private read(): AppData {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...EMPTY_DATA, ...JSON.parse(raw) } : structuredClone(EMPTY_DATA);
    } catch {
      return structuredClone(EMPTY_DATA);
    }
  }

  private write(update: (data: AppData) => AppData) {
    localStorage.setItem(KEY, JSON.stringify(update(this.read())));
  }

  async load() {
    return this.read();
  }

  async setStartedOn(day: string) {
    this.write((d) => ({ ...d, startedOn: day }));
  }

  async upsertHabits(habits: Habit[]) {
    this.write((d) => {
      const ids = new Set(habits.map((h) => h.id));
      return { ...d, habits: [...d.habits.filter((h) => !ids.has(h.id)), ...habits] };
    });
  }

  async addLog(log: Log) {
    this.write((d) => ({ ...d, logs: [...d.logs, log] }));
  }

  async deleteLog(id: string) {
    this.write((d) => ({ ...d, logs: d.logs.filter((l) => l.id !== id) }));
  }

  async upsertTargets(rows: TargetRow[]) {
    this.write((d) => ({ ...d, targets: mergeTargets(d.targets, rows) }));
  }

  async addYardItem(item: YardItem) {
    this.write((d) => ({ ...d, yard: [...d.yard, item] }));
  }

  async deleteYardItem(id: string) {
    this.write((d) => ({ ...d, yard: d.yard.filter((y) => y.id !== id) }));
  }

  async addPull(pull: CapsulePull) {
    this.write((d) => ({ ...d, pulls: [...d.pulls, pull] }));
  }
}

export function mergeTargets(existing: TargetRow[], rows: TargetRow[]): TargetRow[] {
  const key = (r: TargetRow) => `${r.pillar}|${r.weekStart}`;
  const replaced = new Set(rows.map(key));
  return [...existing.filter((r) => !replaced.has(key(r))), ...rows];
}
