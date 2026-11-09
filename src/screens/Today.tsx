import { useMemo } from 'react';
import { longDate, today, weekStart } from '../dates';
import { PILLAR_INFO } from '../pillars';
import { buildingName, levelFor, type Level } from '../iso/buildings';
import { DayCard } from './DayCard';
import { SeedCount } from './SeedCount';
import { PillarIcon } from '../iso/IsoIcon';
import { BALANCED_PILLARS, deriveTown, variantFor } from '../town';
import { sfx } from '../sound';
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
    // Seeds this habit earns: the town's total with it, minus the total without it.
    const withLog = { ...data, logs: [...data.logs, { id: 'preview', habitId: habit.id, pillar: habit.pillar, day, createdAt: new Date().toISOString() }] };
    const gain = deriveTown(withLog, day).seeds.earned - town.seeds.earned;
    const entry = actions.logHabit(habit, day);
    playLogSounds(habit, before, after);
    const name = buildingName(habit.pillar, level);
    const message = before === 0 ? `Built a ${name}!` : after <= 3 ? `Upgraded to a ${name}!` : `${name} · ${PILLAR_INFO[habit.pillar].name} ×${after}`;
    toast({
      content: (
        <>
          <PillarIcon pillar={habit.pillar} level={level} variant={variantFor(day + habit.pillar)} size={32} />
          <span className="toast-message">{message}</span>
          <span className="seed-gain">
            +<SeedCount value={gain} plain />
          </span>
        </>
      ),
      action: {
        label: 'Undo',
        run: () => {
          sfx.undo();
          actions.removeLog(entry.id);
        },
      },
    });
  };

  /** The building sound right away, then a chime if the lamp lights and a fanfare if the week becomes full. */
  const playLogSounds = (habit: Habit, before: number, after: number) => {
    if (before === 0) sfx.build(habit.pillar);
    else if (after <= 3) sfx.evolve(habit.pillar, after as 2 | 3);
    else sfx.extra(habit.pillar);

    const lampLights = before === 0 && dayBlock.pillarsTouched + 1 === BALANCED_PILLARS;
    // Lines up with the lamp flicker, which starts after the building lands.
    if (lampLights) setTimeout(sfx.lampLit, 420);

    const targets = PILLARS.filter((p) => week.progress[p].target > 0);
    const fullAfter =
      targets.length > 0 &&
      targets.every((p) => week.progress[p].count + (p === habit.pillar ? 1 : 0) >= week.progress[p].target);
    if (week.isCurrent && !week.fullWeek && fullAfter) setTimeout(sfx.fullWeek, lampLights ? 900 : 400);
  };

  const unlog = (habit: Habit) => {
    const last = logsForDay.filter((l) => l.habitId === habit.id).at(-1);
    if (!last) return;
    sfx.undo();
    actions.removeLog(last.id);
  };

  return (
    <div className="stack">
      <DayCard day={dayBlock} title={`Today · ${longDate(day)}`} pinnable />

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
