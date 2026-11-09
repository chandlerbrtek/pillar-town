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

/** A decoration placed in a week's yard. Its price is kept so the balance never changes if prices do. */
export interface YardItem {
  id: string;
  /** The Monday of the week whose yard it sits in. */
  weekStart: string;
  /** 0-8, row by row across the yard's 3x3 grid. */
  cell: number;
  decor: string;
  price: number;
  createdAt: string;
}

export interface AppData {
  /** The day the town was founded. Null until onboarding is done. */
  startedOn: string | null;
  habits: Habit[];
  logs: Log[];
  targets: TargetRow[];
  yard: YardItem[];
}

export const EMPTY_DATA: AppData = { startedOn: null, habits: [], logs: [], targets: [], yard: [] };
