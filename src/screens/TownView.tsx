import { memo, useMemo, useState } from 'react';
import { addDays, parseDay, shortDate, today, weekStart, weekdayShort } from '../dates';
import { IslandCanvas } from '../iso/IslandCanvas';
import { renderWeek, toDataUrl, WEEK_GARDEN_ID, WEEK_PLAZA_ID } from '../iso/scenes';
import { sfx } from '../sound';
import { deriveTown, type WeekBlock } from '../town';
import { PILLARS, type AppData } from '../types';
import { DayCard } from './DayCard';
import { WeekTargets } from './WeekTargets';

type Zoom = 'week' | 'year';

export function TownView({ data }: { data: AppData }) {
  const town = useMemo(() => deriveTown(data, today()), [data]);
  const [zoom, setZoom] = useState<Zoom>('week');
  // Which week is shown in week view, by its Monday. Null means this week.
  const [shown, setShown] = useState<string | null>(null);

  const buildings = town.weeks.reduce((n, w) => n + w.days.reduce((m, d) => m + d.pillarsTouched, 0), 0);
  const litDays = town.weeks.reduce((n, w) => n + w.days.filter((d) => d.balanced).length, 0);
  const fullWeeks = town.weeks.filter((w) => w.fullWeek && !w.isCurrent).length;
  const wilted = PILLARS.reduce((n, p) => n + town.openWilted[p], 0);

  const index = Math.max(0, shown ? town.weeks.findIndex((w) => w.weekStart === shown) : town.weeks.length - 1);
  const week = town.weeks[index];

  const openWeek = (start: string) => {
    setShown(start);
    setZoom('week');
    window.scrollTo(0, 0);
  };

  return (
    <div className="stack">
      <section className="stats">
        <Stat label="Buildings" value={buildings} />
        <Stat label="Lamps lit" value={litDays} />
        <Stat label="Full weeks" value={fullWeeks} />
        <Stat label="Wilted" value={wilted} />
      </section>

      <div className="zoom-toggle" role="tablist" aria-label="Town zoom">
        {(['week', 'year'] as Zoom[]).map((z) => (
          <button key={z} role="tab" aria-selected={zoom === z} className={zoom === z ? 'on' : ''} onClick={() => setZoom(z)}>
            {z === 'week' ? 'Week' : 'Year'}
          </button>
        ))}
      </div>

      {zoom === 'week' && week && (
        <>
          <div className="week-nav">
            <button onClick={() => setShown(town.weeks[index - 1].weekStart)} disabled={index === 0} aria-label="Previous week">
              ‹
            </button>
            <span>{week.isCurrent ? 'This week' : `Week of ${shortDate(week.weekStart)}`}</span>
            <button onClick={() => setShown(index + 1 >= town.weeks.length - 1 ? null : town.weeks[index + 1].weekStart)} disabled={week.isCurrent} aria-label="Next week">
              ›
            </button>
          </div>
          <WeekIsland key={week.weekStart} week={week} />
          {week.isCurrent ? (
            <WeekTargets week={week} town={town} />
          ) : (
            <button className="btn" onClick={() => setShown(null)}>
              Back to this week
            </button>
          )}
        </>
      )}

      {zoom === 'year' && <YearView weeks={town.weeks} onOpen={openWeek} />}
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

// ---------- Year view ----------

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Every Monday whose week starts in the given year. */
function mondaysOf(year: number): string[] {
  const out: string[] = [];
  let w = weekStart(`${year}-01-01`);
  if (parseDay(w).getFullYear() < year) w = addDays(w, 7);
  for (; parseDay(w).getFullYear() === year; w = addDays(w, 7)) out.push(w);
  return out;
}

function YearView({ weeks, onOpen }: { weeks: WeekBlock[]; onOpen: (start: string) => void }) {
  const thisYear = parseDay(today()).getFullYear();
  const firstYear = weeks.length ? parseDay(weeks[0].weekStart).getFullYear() : thisYear;
  const [year, setYear] = useState(thisYear);
  const byStart = useMemo(() => new Map(weeks.map((w) => [w.weekStart, w])), [weeks]);
  const mondays = mondaysOf(year);
  const inYear = mondays.map((m) => byStart.get(m)).filter((w): w is WeekBlock => !!w);
  const full = inYear.filter((w) => w.fullWeek && !w.isCurrent).length;
  const lamps = inYear.reduce((n, w) => n + w.days.filter((d) => d.balanced).length, 0);

  // Group the weeks by the month their Monday falls in.
  const months = new Map<number, string[]>();
  for (const m of mondays) {
    const month = parseDay(m).getMonth();
    if (!months.has(month)) months.set(month, []);
    months.get(month)!.push(m);
  }

  return (
    <section className="block">
      <div className="week-nav">
        <button onClick={() => setYear(year - 1)} disabled={year <= firstYear} aria-label="Previous year">
          ‹
        </button>
        <span>{year}</span>
        <button onClick={() => setYear(year + 1)} disabled={year >= thisYear} aria-label="Next year">
          ›
        </button>
      </div>
      <p className="tile-detail">
        {inYear.length} {inYear.length === 1 ? 'week' : 'weeks'} built · {full} full · {lamps} lamps lit. Tap an island to visit that week.
      </p>
      <div className="sky archipelago">
        {[...months].map(([month, starts]) => (
          <div key={month} className="year-month">
            <h3>{MONTHS[month]}</h3>
            <div className="year-row">
              {starts.map((start) => {
                const w = byStart.get(start);
                return w ? (
                  <YearIsland key={start} week={w} onOpen={onOpen} />
                ) : (
                  <span key={start} className={start > today() ? 'year-slot future' : 'year-slot'} aria-hidden />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const YearIsland = memo(function YearIsland({ week, onOpen }: { week: WeekBlock; onOpen: (start: string) => void }) {
  const key = JSON.stringify(week);
  const url = useMemo(() => toDataUrl(renderWeek(week, 12)), [key]);
  const label = week.isCurrent ? 'This week' : `Week of ${shortDate(week.weekStart)}`;
  return (
    <button
      className={`year-island${week.isCurrent ? ' current' : ''}${week.fullWeek ? ' full' : ''}`}
      onClick={() => {
        sfx.tap();
        onOpen(week.weekStart);
      }}
      aria-label={`${label}${week.fullWeek ? ', full week' : ''}`}
    >
      <img src={url} alt="" />
      <span>{shortDate(week.weekStart).split(' ')[1]}</span>
    </button>
  );
});
