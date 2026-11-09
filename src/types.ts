export const PILLARS = [
  'vitality',
  'mind',
  'heart',
  'spirit',
  'bond',
  'craft',
  'fortune',
  'harmony',
] as const;

export type Pillar = (typeof PILLARS)[number];

export interface Habit {
  id: string;
  name: string;
  pillar: Pillar;
  archived: boolean;
  createdAt: string;
}

/** One logged habit. `day` is a local date, YYYY-MM-DD. */
export interface Log {
  id: string;
  habitId: string | null;
  pillar: Pillar;
  day: string;
  createdAt: string;
}

/** A pillar's weekly target, in effect from `weekStart` until a later row replaces it. */
export interface TargetRow {
  pillar: Pillar;
  weekStart: string;
  target: number;
}

export interface AppData {
  /** The Monday of the first week that counts. Null until onboarding is done. */
  startedOn: string | null;
  habits: Habit[];
  logs: Log[];
  targets: TargetRow[];
}

export const EMPTY_DATA: AppData = { startedOn: null, habits: [], logs: [], targets: [] };
