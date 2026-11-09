import { useMemo, useState } from 'react';
import { shortDate, today } from '../dates';
import { PILLAR_INFO } from '../pillars';
import { BUILDING_NAMES, PillarSprite, Sprite } from '../sprites';
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
  key: string;
  node: React.ReactNode;
  detail: string;
  className?: string;
}

function Block({ week }: { week: WeekBlock }) {
  const [selected, setSelected] = useState<string | null>(null);

  const tiles: Tile[] = [];
  if (week.fullWeek) {
    tiles.push({
      key: 'fountain',
      node: <Sprite name="fountain" />,
      detail: week.isCurrent ? 'Fountain: every target met this week!' : 'Fountain: a full week, every target met',
      className: 'landmark',
    });
  }
  for (const b of week.buildings) {
    tiles.push({
      key: b.logId,
      node: <PillarSprite pillar={b.pillar} variant={b.variant} />,
      detail: `${BUILDING_NAMES[b.pillar]} · ${b.habitName} · ${shortDate(b.day)}`,
    });
  }
  for (const s of week.wilted) {
    tiles.push(
      s.restoredIn
        ? {
            key: s.id,
            node: <Sprite name="blossom" />,
            detail: `Restored ${PILLAR_INFO[s.pillar].name} spot · missed this week, bloomed again the week of ${shortDate(s.restoredIn)}`,
          }
        : {
            key: s.id,
            node: <Sprite name="wilted" />,
            detail: `Wilted ${PILLAR_INFO[s.pillar].name} spot · go past your ${PILLAR_INFO[s.pillar].name} target in a later week to restore it`,
            className: 'wilted',
          },
    );
  }
  if (week.isCurrent) {
    for (const p of PILLARS) {
      const open = Math.max(0, week.progress[p].target - week.progress[p].count);
      for (let i = 0; i < open; i++) {
        tiles.push({
          key: `open-${p}-${i}`,
          node: <span className="lot-dot" style={{ background: PILLAR_INFO[p].color }} />,
          detail: `Empty ${PILLAR_INFO[p].name} lot · log a ${PILLAR_INFO[p].name} habit to build here`,
          className: 'lot',
        });
      }
    }
  }

  const detail = tiles.find((t) => t.key === selected)?.detail;

  return (
    <section className={week.isCurrent ? 'block current' : 'block'}>
      <div className="block-head">
        <h3>{week.isCurrent ? 'This week' : `Week of ${shortDate(week.weekStart)}`}</h3>
        <div className="block-badges">
          {week.fullWeek && <span className="badge gold">Full week</span>}
          {week.isWarmup && <span className="badge">Warm-up</span>}
        </div>
      </div>
      <div className="ground">
        {tiles.length === 0 && <p className="tiny muted center">Nothing built this week.</p>}
        {tiles.map((t) => (
          <button
            key={t.key}
            className={`tile ${t.className ?? ''} ${selected === t.key ? 'selected' : ''}`}
            onClick={() => setSelected(selected === t.key ? null : t.key)}
            aria-label={t.detail}
          >
            {t.node}
          </button>
        ))}
      </div>
      {detail && <p className="tile-detail">{detail}</p>}
    </section>
  );
}
