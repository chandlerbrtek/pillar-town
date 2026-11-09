import { useEffect, useMemo, useRef, useState } from 'react';
import { longDate, today, weekStart } from '../dates';
import { PILLAR_INFO } from '../pillars';
import { buildingName, levelFor, type Level } from '../iso/buildings';
import { DayCard } from './DayCard';
import { SeedCount } from './SeedCount';
import { PillarIcon } from '../iso/IsoIcon';
import { deriveTown, SEEDS, variantFor } from '../town';
import { sfx } from '../sound';
import { useToast } from '../Toast';
import { PILLARS, SIZES, type AppData, type Habit, type Size } from '../types';

const SIZE_LABEL: Record<Size, string> = { small: 'Small', usual: 'Usual', big: 'Big' };
/** What a size means for a habit; Usual falls back to the habit's name. */
const sizeText = (h: Habit, s: Size) => (s === 'usual' ? h.usual : h[s]);
const sizesOf = (h: Habit) => SIZES.filter((s) => s === 'usual' || h[s]);
import type { Actions } from '../useData';

export function Today({ data, actions }: { data: AppData; actions: Actions }) {
  const toast = useToast();
  const day = today();

  const town = useMemo(() => deriveTown(data, day), [data, day]);
  const week = town.weeks.find((w) => w.weekStart === weekStart(day)) ?? town.weeks[town.weeks.length - 1];
  const habits = data.habits.filter((h) => !h.archived);
  const logsForDay = data.logs.filter((l) => l.day === day);

  const dayBlock = week.days.find((d) => d.day === day)!;

  // After logging, a row of sizes shows under the habit for a few seconds to switch from Usual.
  const [adjust, setAdjust] = useState<{ habitId: string; logId: string } | null>(null);
  const timer = useRef(0);
  const openAdjust = (habitId: string, logId: string) => {
    setAdjust({ habitId, logId });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdjust(null), 6000);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const resize = (habit: Habit, logId: string, size: Size) => {
    actions.setLogSize(logId, size);
    setAdjust(null);
    sfx.tap();
    toast({
      content: (
        <span className="toast-message">
          {size === 'small' ? `Small counts. ${habit.name} done.` : size === 'big' ? `Big day! +${SEEDS.bigBonus} bonus seed.` : `${habit.name}: Usual.`}
        </span>
      ),
    });
  };

  const log = (habit: Habit) => {
    const before = dayBlock.counts[habit.pillar];
    const after = before + 1;
    const level = levelFor(after) as Level;
    // Seeds this habit earns: the town's total with it, minus the total without it.
    const withLog = { ...data, logs: [...data.logs, { id: 'preview', habitId: habit.id, pillar: habit.pillar, day, createdAt: new Date().toISOString() }] };
    const gain = deriveTown(withLog, day).seeds.earned - town.seeds.earned;
    const entry = actions.logHabit(habit, day);
    if (sizesOf(habit).length > 1) openAdjust(habit.id, entry.id);
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

    const lampLights = before === 0 && dayBlock.pillarsTouched + 1 === dayBlock.lampNeed;
    // Lines up with the lamp flicker, which starts after the building lands.
    if (lampLights) setTimeout(sfx.lampLit, 420);

    const targets = PILLARS.filter((p) => week.progress[p].target > 0);
    const fullAfter =
      targets.length > 0 &&
      targets.every((p) => week.progress[p].count + (p === habit.pillar && before === 0 ? 1 : 0) >= week.progress[p].target);
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
              const mine = logsForDay.filter((l) => l.habitId === h.id);
              const count = mine.length;
              const last = mine.at(-1);
              const lastSize = last?.size ?? 'usual';
              const detail = last ? sizeText(h, lastSize) : h.usual;
              const open = adjust?.habitId === h.id;
              return (
                <div key={h.id} className="habit-block">
                <div className="habit-row" style={{ borderColor: count > 0 ? info.color : undefined }}>
                  <button className="habit-main" onClick={() => log(h)}>
                    <span className="habit-name">
                      {h.name}
                      {(detail || last) && (
                        <span className="habit-detail">
                          {last && sizesOf(h).length > 1 && <span className={`size-tag ${lastSize}`}>{SIZE_LABEL[lastSize]}</span>}
                          {detail}
                        </span>
                      )}
                    </span>
                    {count > 1 && <span className="habit-count">×{count}</span>}
                    <span className="habit-plus" style={{ background: info.color }}>
                      +
                    </span>
                  </button>
                  {count > 0 && sizesOf(h).length > 1 && last && (
                    <button className="habit-size" onClick={() => (open ? setAdjust(null) : openAdjust(h.id, last.id))} aria-label={`Change size of ${h.name}`}>
                      ⋯
                    </button>
                  )}
                  {count > 0 && (
                    <button className="habit-minus" onClick={() => unlog(h)} aria-label={`Remove one ${h.name}`}>
                      −
                    </button>
                  )}
                </div>
                {open && last && (
                  <div className="size-row" role="group" aria-label={`Size for ${h.name}`}>
                    {sizesOf(h).map((s) => (
                      <button key={s} className={`size-choice ${s}${(last.size ?? 'usual') === s ? ' on' : ''}`} onClick={() => resize(h, last.id, s)}>
                        <b>{SIZE_LABEL[s]}</b>
                        <span>{sizeText(h, s) ?? h.name}</span>
                      </button>
                    ))}
                  </div>
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
