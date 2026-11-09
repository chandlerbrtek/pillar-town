import { Fragment, useMemo, useState } from 'react';
import { shortDate, today, weekdayShort } from '../dates';
import { IslandCanvas } from '../iso/IslandCanvas';
import { renderWeek, WEEK_GARDEN_ID, WEEK_PLAZA_ID } from '../iso/scenes';
import { deriveTown, type WeekBlock } from '../town';
import { PILLARS, type AppData } from '../types';
import { DayCard } from './DayCard';
import { WeekTargets } from './WeekTargets';

export function TownView({ data }: { data: AppData }) {
  const town = useMemo(() => deriveTown(data, today()), [data]);
  const weeks = [...town.weeks].reverse();

  const buildings = town.weeks.reduce((n, w) => n + w.days.reduce((m, d) => m + d.pillarsTouched, 0), 0);
  const litDays = town.weeks.reduce((n, w) => n + w.days.filter((d) => d.balanced).length, 0);
  const fullWeeks = town.weeks.filter((w) => w.fullWeek && !w.isCurrent).length;
  const wilted = PILLARS.reduce((n, p) => n + town.openWilted[p], 0);

  return (
    <div className="stack">
      <section className="stats">
        <Stat label="Buildings" value={buildings} />
        <Stat label="Lamps lit" value={litDays} />
        <Stat label="Full weeks" value={fullWeeks} />
        <Stat label="Wilted" value={wilted} />
      </section>
      {weeks.map((w) => (
        <Fragment key={w.weekStart}>
          <WeekIsland week={w} />
          {w.isCurrent && <WeekTargets week={w} town={town} />}
        </Fragment>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="tiny muted">{label}</div>
    </div>
  );
}

function WeekIsland({ week }: { week: WeekBlock }) {
  const key = JSON.stringify(week);
  const img = useMemo(() => renderWeek(week), [key]);
  const [selected, setSelected] = useState<number | null>(null);
  const title = week.isCurrent ? 'This week' : `Week of ${shortDate(week.weekStart)}`;
  const selectedDay = selected && selected <= 7 ? week.days[selected - 1] : null;

  return (
    <section className={week.isCurrent ? 'block current' : 'block'}>
      <div className="block-head">
        <h3>{title}</h3>
        <div className="block-badges">
          {week.fullWeek && <span className="badge gold">Full week</span>}
          {week.isWarmup && <span className="badge">Warm-up</span>}
        </div>
      </div>
      <div className="sky">
        <IslandCanvas img={img} selected={selected} onSelect={setSelected} label={`${title}: seven day blocks around a plaza`} />
      </div>
      <p className="tile-detail">{describe(week, selected)}</p>
      {selectedDay && (
        <div className="zoom">
          <DayCard day={selectedDay} />
        </div>
      )}
    </section>
  );
}

function describe(week: WeekBlock, id: number | null): string {
  if (id === null) return 'Days run clockwise from the top corner, Mon to Sun. Tap a day to see it up close.';
  if (id === WEEK_PLAZA_ID)
    return week.fullWeek
      ? 'Grand fountain: every weekly target met.'
      : week.isCurrent
        ? 'The plaza earns a grand fountain when every weekly target is met.'
        : 'Empty pedestal: not every target was met this week.';
  if (id === WEEK_GARDEN_ID) {
    const restored = week.wilted.filter((s) => s.restoredIn).length;
    const open = week.wilted.length - restored;
    if (week.wilted.length === 0) return week.isCurrent ? 'Garden: missed targets wilt here when the week ends.' : 'Garden: no missed targets this week.';
    return `Garden: ${week.wilted.length} missed ${week.wilted.length === 1 ? 'target' : 'targets'}. ${restored} bloomed again, ${open} still wilted.`;
  }
  const day = week.days[id - 1];
  if (!day.active) return `${weekdayShort(day.day)} ${shortDate(day.day)}: ${day.day > today() ? 'still to come.' : 'before your town began.'}`;
  return `${weekdayShort(day.day)} ${shortDate(day.day)}: ${day.pillarsTouched} of 8 pillars${day.balanced ? ', lamp lit' : ''}.`;
}
