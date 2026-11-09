import { memo, useMemo, useState } from 'react';
import { addDays, parseDay, shortDate, today, weekStart, weekdayShort } from '../dates';
import { IslandCanvas } from '../iso/IslandCanvas';
import { renderWeek, toDataUrl, WEEK_PLAZA_ID, WEEK_YARD_ID } from '../iso/scenes';
import { sfx } from '../sound';
import { deriveTown, type Town, type WeekBlock } from '../town';
import type { AppData, YardItem } from '../types';
import type { Actions } from '../useData';
import { DayCard } from './DayCard';
import { WeekTargets } from './WeekTargets';
import { YardCard } from './YardCard';
import { CRITTERS, type Critter } from '../collection/roster';

type Zoom = 'week' | 'year';

export function TownView({ data, actions }: { data: AppData; actions: Actions }) {
  const town = useMemo(() => deriveTown(data, today()), [data]);
  const [zoom, setZoom] = useState<Zoom>('week');
  // Which week is shown in week view, by its Monday. Null means this week.
  const [shown, setShown] = useState<string | null>(null);

  const buildings = town.weeks.reduce((n, w) => n + w.days.reduce((m, d) => m + d.pillarsTouched, 0), 0);
  const litDays = town.weeks.reduce((n, w) => n + w.days.filter((d) => d.balanced).length, 0);
  const fullWeeks = town.weeks.filter((w) => w.fullWeek && !w.isCurrent).length;

  const index = Math.max(0, shown ? town.weeks.findIndex((w) => w.weekStart === shown) : town.weeks.length - 1);
  const week = town.weeks[index];
  const yardFor = (start: string) => data.yard.filter((y) => y.weekStart === start);
  const critters = useMemo(() => {
    const keys = new Set(data.pulls.map((p) => p.critter));
    return CRITTERS.filter((c) => keys.has(c.key));
  }, [data.pulls]);

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
        <Stat label="Seeds earned" value={town.seeds.earned} />
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
          <WeekIsland key={week.weekStart} week={week} yard={yardFor(week.weekStart)} town={town} critters={critters} actions={actions} />
          {week.isCurrent ? (
            <WeekTargets week={week} town={town} />
          ) : (
            <button className="btn" onClick={() => setShown(null)}>
              Back to this week
            </button>
          )}
        </>
      )}

      {zoom === 'year' && <YearView weeks={town.weeks} yard={data.yard} onOpen={openWeek} />}
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

function WeekIsland({ week, yard, town, critters, actions }: { week: WeekBlock; yard: YardItem[]; town: Town; critters: Critter[]; actions: Actions }) {
  const key = JSON.stringify(week) + JSON.stringify(yard);
  const img = useMemo(() => renderWeek(week, 36, yard), [key]);
  const [selected, setSelected] = useState<number | null>(null);
  const title = week.isCurrent ? 'This week' : `Week of ${shortDate(week.weekStart)}`;
  const selectedDay = selected && selected <= 7 ? week.days[selected - 1] : null;

  return (
    <section className={week.isCurrent ? 'block current' : 'block'}>
      <div className="block-head">
        <h3>{title}</h3>
        <div className="block-badges">
          {week.fullWeek && <span className="badge gold">Full week</span>}
        </div>
      </div>
      <div className="sky">
        <IslandCanvas img={img} selected={selected} onSelect={setSelected} label={`${title}: seven day blocks around a plaza`} />
      </div>
      <p className="tile-detail">{describe(week, selected, yard.length)}</p>
      {selectedDay && (
        <div className="zoom">
          <DayCard day={selectedDay} />
        </div>
      )}
      {selected === WEEK_YARD_ID && (
        <div className="zoom">
          <YardCard weekStart={week.weekStart} isCurrent={week.isCurrent} items={yard} balance={town.seeds.balance} critters={critters} actions={actions} />
        </div>
      )}
    </section>
  );
}

function describe(week: WeekBlock, id: number | null, decorations: number): string {
  if (id === null) return 'Days run clockwise from the top corner, Mon to Sun. Tap a day or the yard to see it up close.';
  if (id === WEEK_PLAZA_ID)
    return week.fullWeek
      ? 'Grand fountain: every weekly target met.'
      : week.isCurrent
        ? 'The plaza earns a grand fountain when every weekly target is met.'
        : 'Empty pedestal: not every target was met this week.';
  if (id === WEEK_YARD_ID)
    return week.isCurrent
      ? `This week's yard: ${decorations} of 9 spots decorated. Spend seeds to add more.`
      : `Yard: ${decorations} ${decorations === 1 ? 'decoration' : 'decorations'} from this week.`;
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

function YearView({ weeks, yard, onOpen }: { weeks: WeekBlock[]; yard: YardItem[]; onOpen: (start: string) => void }) {
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
                  <YearIsland key={start} week={w} yard={yard.filter((y) => y.weekStart === start)} onOpen={onOpen} />
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

const YearIsland = memo(function YearIsland({ week, yard, onOpen }: { week: WeekBlock; yard: YardItem[]; onOpen: (start: string) => void }) {
  const key = JSON.stringify(week) + JSON.stringify(yard);
  const url = useMemo(() => toDataUrl(renderWeek(week, 12, yard)), [key]);
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
