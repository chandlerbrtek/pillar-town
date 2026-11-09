import { useState } from 'react';
import { PILLAR_INFO, STARTER_HABITS } from '../pillars';
import { PillarIcon } from '../iso/IsoIcon';
import { PILLARS, type Pillar } from '../types';

interface Props {
  onStart: (habits: { name: string; pillar: Pillar }[], targets: Record<Pillar, number>) => Promise<void>;
}

export function Onboarding({ onStart }: Props) {
  const [picked, setPicked] = useState(() => new Set(STARTER_HABITS.map((h) => h.name)));
  const [busy, setBusy] = useState(false);

  const toggle = (name: string) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const start = async () => {
    setBusy(true);
    const targets = Object.fromEntries(PILLARS.map((p) => [p, PILLAR_INFO[p].defaultTarget])) as Record<Pillar, number>;
    await onStart(
      STARTER_HABITS.filter((h) => picked.has(h.name)),
      targets,
    );
    setBusy(false);
  };

  return (
    <div className="stack">
      <section className="panel">
        <h2>Found your town</h2>
        <p>
          Every habit you log builds something in your town. Each of the 8 pillars builds something different, and
          each week becomes a new neighborhood.
        </p>
        <p className="muted">
          Habits earn seeds, which you spend decorating each week's yard. Touch a pillar day after day to build streaks
          and earn bonus seeds.
        </p>
      </section>

      <section className="panel">
        <h2>Starter habits</h2>
        <p className="muted">Pick the ones you want. You can add, rename and remove habits and change targets later.</p>
        {PILLARS.map((p) => (
          <div key={p} className="onboard-pillar">
            <div className="pillar-label">
              <PillarIcon pillar={p} size={34} />
              <div>
                <strong style={{ color: PILLAR_INFO[p].color }}>{PILLAR_INFO[p].name}</strong>
                <div className="tiny muted">
                  {PILLAR_INFO[p].wellness} · target {PILLAR_INFO[p].defaultTarget}/week
                </div>
              </div>
            </div>
            <div className="chips">
              {STARTER_HABITS.filter((h) => h.pillar === p).map((h) => (
                <button
                  key={h.name}
                  className={picked.has(h.name) ? 'chip on' : 'chip'}
                  onClick={() => toggle(h.name)}
                  aria-pressed={picked.has(h.name)}
                >
                  {h.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <button className="btn primary big" onClick={start} disabled={busy || picked.size === 0}>
        {busy ? 'Building…' : 'Found my town'}
      </button>
    </div>
  );
}
