import { useMemo } from 'react';
import { longDate, today, weekStart } from '../dates';
import { PILLAR_INFO } from '../pillars';
import { buildingName, levelFor, type Level } from '../iso/buildings';
import { DayCard } from './DayCard';
import { PillarIcon } from '../iso/IsoIcon';
import { deriveTown, variantFor } from '../town';
import { useToast } from '../Toast';
import { PILLARS, type AppData, type Habit } from '../types';
import type { Actions } from '../useData';

export function Today({ data, actions }: { data: AppData; actions: Actions }) {
  const toast = useToast();
  const day = today();

  const town = useMemo(() => deriveTown(data, day), [data, day]);
  const week = town.weeks.find((w) => w.weekStart === weekStart(day)) ?? town.weeks[town.weeks.length - 1];
  const habits = data.habits.filter((h) => !h.archived);
  const logsForDay = data.logs.filter((l) => l.day === day);

  const dayBlock = week.days.find((d) => d.day === day)!;

  const log = (habit: Habit) => {
    const before = dayBlock.counts[habit.pillar];
    const after = before + 1;
    const level = levelFor(after) as Level;
    const entry = actions.logHabit(habit, day);
    const name = buildingName(habit.pillar, level);
    const message = before === 0 ? `Built a ${name}!` : after <= 3 ? `Upgraded to a ${name}!` : `${name} · ${PILLAR_INFO[habit.pillar].name} ×${after}`;
    toast({
      content: (
        <>
          <PillarIcon pillar={habit.pillar} level={level} variant={variantFor(day + habit.pillar)} size={32} />
          <span>{message}</span>
        </>
      ),
      action: { label: 'Undo', run: () => actions.removeLog(entry.id) },
    });
  };

  const unlog = (habit: Habit) => {
    const last = logsForDay.filter((l) => l.habitId === habit.id).at(-1);
    if (last) actions.removeLog(last.id);
  };

  return (
    <div className="stack">
      <DayCard day={dayBlock} title={`Today · ${longDate(day)}`} />

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
