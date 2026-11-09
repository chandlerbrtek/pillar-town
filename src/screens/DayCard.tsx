import { useMemo, useState } from 'react';
import { longDate } from '../dates';
import { buildingName, levelFor, type Level } from '../iso/buildings';
import { IslandCanvas } from '../iso/IslandCanvas';
import { DAY_LAMP_ID, renderDay } from '../iso/scenes';
import { PILLAR_INFO } from '../pillars';
import { BALANCED_PILLARS, type DayBlock } from '../town';
import { PILLARS } from '../types';

/** One day's block: its island, a lamp badge, and what each lot holds when tapped. */
export function DayCard({ day, title }: { day: DayBlock; title?: string }) {
  const key = JSON.stringify(day);
  const img = useMemo(() => renderDay(day), [key]);
  const [selected, setSelected] = useState<number | null>(null);
  const left = Math.max(0, BALANCED_PILLARS - day.pillarsTouched);

  return (
    <section className="block current">
      <div className="block-head">
        <h3>{title ?? longDate(day.day)}</h3>
        {day.balanced ? (
          <span className="badge gold">Lamp lit · {day.pillarsTouched}/8</span>
        ) : (
          <span className="tiny muted">
            {day.pillarsTouched}/8 pillars · {left} more lights the lamp
          </span>
        )}
      </div>
      <div className="sky">
        <IslandCanvas img={img} selected={selected} onSelect={setSelected} label={`${longDate(day.day)}: ${day.pillarsTouched} of 8 pillars`} />
      </div>
      <p className="tile-detail">{selected ? describe(day, selected) : 'Tap a lot to see what it holds.'}</p>
    </section>
  );
}

function describe(day: DayBlock, id: number): string {
  if (id === DAY_LAMP_ID) {
    return day.balanced
      ? `Lamp lit: ${day.pillarsTouched} pillars touched. A balanced day.`
      : `The lamp lights at ${BALANCED_PILLARS} pillars. ${day.pillarsTouched} so far.`;
  }
  const p = PILLARS[id - 1];
  const name = PILLAR_INFO[p].name;
  const count = day.counts[p];
  if (!count) return `Empty ${name} lot · log a ${name} habit to build here.`;
  const level = levelFor(count) as Level;
  const habits = day.habits[p].map((h) => (h.count > 1 ? `${h.name} ×${h.count}` : h.name)).join(', ');
  const next = level < 3 ? ` · ${3 - count === 1 ? 'one more' : `${3 - count} more`} for a ${buildingName(p, (level + 1) as Level)}` : '';
  return `${buildingName(p, level)} · ${habits}${next}`;
}
