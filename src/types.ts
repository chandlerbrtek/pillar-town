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

/** How big a logged habit was. Every size counts in full; Big earns a bonus seed. */
export type Size = 'small' | 'usual' | 'big';
export const SIZES: Size[] = ['small', 'usual', 'big'];

export interface Habit {
  id: string;
  name: string;
  pillar: Pillar;
  /** On the Someday shelf: kept with its history, but not shown on Today. */
  archived: boolean;
  createdAt: string;
  /** What each size means, like "1 page" / "20 min" / "30 min". Small is asked for on new habits. */
  small?: string;
  usual?: string;
  big?: string;
}

/** One logged habit. `day` is a local date, YYYY-MM-DD. */
export interface Log {
  id: string;
  habitId: string | null;
  pillar: Pillar;
  day: string;
  createdAt: string;
  /** Missing on logs from before sizes existed, which count as usual. */
  size?: Size;
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

/** Where a capsule came from. Wishes pick a specific missing critter with glimmer. */
export type PullSource = 'seeds' | 'lamp' | 'golden' | 'wish';

/** One capsule opened (or one wish granted). Collection, glimmer and pity are worked out from these. */
export interface CapsulePull {
  id: string;
  critter: string;
  source: PullSource;
  /** Seeds spent on this pull. */
  seeds: number;
  /** Glimmer spent on this pull (wishes only). */
  glimmer: number;
  createdAt: string;
}

export interface AppData {
  /** The day the town was founded. Null until onboarding is done. */
  startedOn: string | null;
  habits: Habit[];
  logs: Log[];
  targets: TargetRow[];
  yard: YardItem[];
  pulls: CapsulePull[];
}

export const EMPTY_DATA: AppData = { startedOn: null, habits: [], logs: [], targets: [], yard: [], pulls: [] };
