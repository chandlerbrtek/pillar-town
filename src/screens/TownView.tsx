import { useMemo, useState } from 'react';
import { shortDate, today } from '../dates';
import { PILLAR_INFO } from '../pillars';
import { BUILDING_NAMES, type IsoItem } from '../iso/buildings';
import { IslandCanvas } from '../iso/IslandCanvas';
import { deriveTown, type WeekBlock } from '../town';
import { PILLARS, type AppData } from '../types';

export function TownView({ data }: { data: AppData }) {
  const town = useMemo(() => deriveTown(data, today()), [data]);
  const weeks = [...town.weeks].reverse();

  const buildings = town.weeks.reduce((n, w) => n + w.buildings.length, 0);
  const wilted = PILLARS.reduce((n, p) => n + town.openWilted[p], 0);
  const fullWeeks = town.weeks.filter((w) => w.fullWeek && !w.isCurrent).length;

  return (
    <div className="stack">
      <section className="stats">
        <Stat label="Buildings" value={buildings} />
        <Stat label="Weeks" value={town.weeks.length} />
        <Stat label="Full weeks" value={fullWeeks} />
        <Stat label="Wilted" value={wilted} />
      </section>
      {weeks.map((w) => (
        <Block key={w.weekStart} week={w} />
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

interface Tile {
  item: IsoItem;
  detail: string;
}

function Block({ week }: { week: WeekBlock }) {
  const [selected, setSelected] = useState<number | null>(null);

  const tiles: Tile[] = [];
  if (week.fullWeek) {
    tiles.push({
      item: { kind: 'fountain' },
      detail: week.isCurrent ? 'Fountain: every target met this week!' : 'Fountain: a full week, every target met',
    });
  }
  for (const b of week.buildings) {
    tiles.push({
      item: { kind: b.pillar, variant: b.variant },
      detail: `${BUILDING_NAMES[b.pillar]} · ${b.habitName} · ${shortDate(b.day)}`,
    });
  }
  for (const s of week.wilted) {
    const name = PILLAR_INFO[s.pillar].name;
    tiles.push(
      s.restoredIn
        ? { item: { kind: 'blossom' }, detail: `Restored ${name} spot · missed this week, bloomed again the week of ${shortDate(s.restoredIn)}` }
        : { item: { kind: 'wilted' }, detail: `Wilted ${name} spot · go past your ${name} target in a later week to restore it` },
    );
  }
  if (week.isCurrent) {
    for (const p of PILLARS) {
      const open = Math.max(0, week.progress[p].target - week.progress[p].count);
      for (let i = 0; i < open; i++) {
        const name = PILLAR_INFO[p].name;
        tiles.push({ item: { kind: 'lot', pillar: p }, detail: `Empty ${name} lot · log a ${name} habit to build here` });
      }
    }
  }

  const title = week.isCurrent ? 'This week' : `Week of ${shortDate(week.weekStart)}`;
  const detail = selected !== null ? tiles[selected]?.detail : null;

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
        <IslandCanvas items={tiles.map((t) => t.item)} selected={selected} onSelect={setSelected} label={`${title}: ${tiles.length} spots`} />
      </div>
      <p className="tile-detail">{detail ?? (tiles.length ? 'Tap a building to see what it is.' : 'Nothing built this week.')}</p>
    </section>
  );
}
