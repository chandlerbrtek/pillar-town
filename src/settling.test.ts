import { describe, expect, it } from 'vitest';
import { hasRoom, isSettled, recentDays } from './settling';
import type { AppData, Habit, Log } from './types';

const habit = (id: string, archived = false): Habit => ({ id, name: id, pillar: 'mind', archived, createdAt: '2026-11-01T08:00:00' });
const logs = (id: string, days: number[]): Log[] =>
  days.map((d, i) => ({ id: `${id}-${i}`, habitId: id, pillar: 'mind', day: `2026-11-${String(d).padStart(2, '0')}`, createdAt: '' }));
const data = (habits: Habit[], l: Log[]): AppData => ({ startedOn: '2026-11-01', habits, logs: l, targets: [], yard: [], pulls: [] });

describe('settling', () => {
  it('settles after 10 days within any 14, and stays settled', () => {
    const almost = data([habit('a')], logs('a', [1, 2, 3, 4, 5, 6, 7, 8, 9, 20]));
    expect(isSettled(habit('a'), almost)).toBe(false);
    const done = data([habit('a')], logs('a', [1, 2, 3, 4, 5, 6, 7, 8, 9, 14]));
    expect(isSettled(habit('a'), done)).toBe(true);
    expect(recentDays(habit('a'), done, '2026-11-30')).toBe(0);
  });

  it('allows three settling habits at once, not counting Someday', () => {
    expect(hasRoom(data([habit('a'), habit('b')], []))).toBe(true);
    expect(hasRoom(data([habit('a'), habit('b'), habit('c')], []))).toBe(false);
    expect(hasRoom(data([habit('a'), habit('b'), habit('c', true)], []))).toBe(true);
  });
});
