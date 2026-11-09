import { useMemo, useState } from 'react';
import { addDays, today, weekStart } from '../dates';
import { PILLAR_INFO } from '../pillars';
import { BUILDING_NAMES, PillarSprite } from '../sprites';
import { deriveTown, variantFor } from '../town';
import { useToast } from '../Toast';
import { PILLARS, type AppData, type Habit } from '../types';
import type { Actions } from '../useData';

export function Today({ data, actions }: { data: AppData; actions: Actions }) {
  const toast = useToast();
  const [which, setWhich] = useState<'today' | 'yesterday'>('today');
  const todayDay = today();
  const yesterday = addDays(todayDay, -1);
  const canYesterday = !!data.startedOn && yesterday >= data.startedOn;
  const day = which === 'yesterday' && canYesterday ? yesterday : todayDay;

  const town = useMemo(() => deriveTown(data, todayDay), [data, todayDay]);
  // Show the balance for the week the selected day falls in.
  const week = town.weeks.find((w) => w.weekStart === weekStart(day)) ?? town.weeks[town.weeks.length - 1];
  const habits = data.habits.filter((h) => !h.archived);
  const logsForDay = data.logs.filter((l) => l.day === day);

  const log = (habit: Habit) => {
    const entry = actions.logHabit(habit, day);
    toast({
      content: (
        <>
          <PillarSprite pillar={habit.pillar} variant={variantFor(entry.id)} size={28} />
          <span>{BUILDING_NAMES[habit.pillar]} placed!</span>
        </>
      ),
      action: { label: 'Undo', run: () => actions.removeLog(entry.id) },
    });
  };

  const unlog = (habit: Habit) => {
    const last = logsForDay.filter((l) => l.habitId === habit.id).at(-1);
    if (last) actions.removeLog(last.id);
  };

  const remaining = PILLARS.reduce((n, p) => n + Math.max(0, week.progress[p].target - week.progress[p].count), 0);

  return (
    <div className="stack">
      <div className="segmented" role="tablist">
        <button className={day === todayDay ? 'on' : ''} onClick={() => setWhich('today')}>
          Today
        </button>
        <button className={day === yesterday ? 'on' : ''} onClick={() => setWhich('yesterday')} disabled={!canYesterday}>
          Yesterday
        </button>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>{week.isCurrent ? 'This week' : 'Last week'}</h2>
          {week.fullWeek ? (
            <span className="badge gold">Full week!</span>
          ) : (
            <span className="tiny muted">{remaining} to go for a full week</span>
          )}
        </div>
        <ul className="balance">
          {PILLARS.map((p) => {
            const { count, target } = week.progress[p];
            const pct = target > 0 ? Math.min(1, count / target) : count > 0 ? 1 : 0;
            const info = PILLAR_INFO[p];
            return (
              <li key={p}>
                <PillarSprite pillar={p} size={22} />
                <span className="balance-name">{info.name}</span>
                <span className="bar" aria-hidden>
                  <span style={{ width: `${pct * 100}%`, background: info.color }} />
                </span>
                <span className="balance-count">
                  {count}/{target}
                </span>
                <span className="balance-tags">
                  {week.isCurrent && town.weakest === p && <span className="badge focus">Focus</span>}
                  {town.openWilted[p] > 0 && <span className="badge wilt">{town.openWilted[p]} wilted</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {PILLARS.map((p) => {
        const list = habits.filter((h) => h.pillar === p);
        if (list.length === 0) return null;
        const info = PILLAR_INFO[p];
        return (
          <section key={p} className="habit-group">
            <h3 style={{ color: info.color }}>{info.name}</h3>
            {list.map((h) => {
              const count = logsForDay.filter((l) => l.habitId === h.id).length;
              return (
                <div key={h.id} className="habit-row" style={{ borderColor: count > 0 ? info.color : undefined }}>
                  <button className="habit-main" onClick={() => log(h)}>
                    <span className="habit-name">{h.name}</span>
                    {count > 0 && <span className="habit-count">×{count}</span>}
                    <span className="habit-plus" style={{ background: info.color }}>
                      +
                    </span>
                  </button>
                  {count > 0 && (
                    <button className="habit-minus" onClick={() => unlog(h)} aria-label={`Remove one ${h.name}`}>
                      −
                    </button>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}

      {habits.length === 0 && <p className="muted center">No habits yet. Add some on the Habits tab.</p>}
    </div>
  );
}
