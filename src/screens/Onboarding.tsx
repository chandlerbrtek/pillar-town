import { useState } from 'react';
import { PILLAR_INFO } from '../pillars';
import { PillarIcon } from '../iso/IsoIcon';
import { MAX_SETTLING } from '../settling';
import { PILLARS, type Pillar } from '../types';
import type { NewHabit } from '../useData';
import { cleanSizes, SizeFields } from './SizeFields';

interface Props {
  onStart: (habits: NewHabit[]) => Promise<void>;
}

/** Founding the town: up to three habits, each with a Small version. */
export function Onboarding({ onStart }: Props) {
  const [picked, setPicked] = useState<NewHabit[]>([]);
  const [own, setOwn] = useState('');
  const [ownPillar, setOwnPillar] = useState<Pillar>('vitality');
  const [busy, setBusy] = useState(false);
  const full = picked.length >= MAX_SETTLING;
  const has = (name: string) => picked.some((h) => h.name === name);

  const toggle = (name: string, pillar: Pillar) =>
    setPicked((list) => (list.some((h) => h.name === name) ? list.filter((h) => h.name !== name) : list.length >= MAX_SETTLING ? list : [...list, { name, pillar }]));

  const addOwn = (e: React.FormEvent) => {
    e.preventDefault();
    const name = own.trim();
    if (!name || has(name) || full) return;
    setPicked((list) => [...list, { name, pillar: ownPillar }]);
    setOwn('');
  };

  const ready = picked.length > 0 && picked.every((h) => h.small?.trim());

  const start = async () => {
    setBusy(true);
    await onStart(picked.map((h) => ({ name: h.name, pillar: h.pillar, ...cleanSizes(h) })));
    setBusy(false);
  };

  return (
    <div className="stack">
      <section className="panel">
        <h2>Found your town</h2>
        <p>
          Every habit you log builds something in your town. Each of the 8 pillars builds something different, and each week becomes a new
          neighborhood.
        </p>
        <p className="muted">
          Start with up to three habits. Each one settles in after you've done it on 10 of 14 days, and then there's room for another. Three that
          stick beat fifteen that fizzle.
        </p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Pick up to {MAX_SETTLING}</h2>
          <span className="pick-pips" aria-label={`${picked.length} of ${MAX_SETTLING} picked`}>
            {Array.from({ length: MAX_SETTLING }, (_, i) => (
              <span key={i} className={i < picked.length ? 'on' : ''} />
            ))}
          </span>
        </div>
        {PILLARS.map((p) => (
          <div key={p} className="onboard-pillar">
            <div className="pillar-label">
              <PillarIcon pillar={p} size={34} />
              <div>
                <strong style={{ color: PILLAR_INFO[p].color }}>{PILLAR_INFO[p].name}</strong>
                <div className="tiny muted">{PILLAR_INFO[p].wellness}</div>
              </div>
            </div>
            <div className="chips">
              {PILLAR_INFO[p].suggestions.map((name) => (
                <button key={name} className={has(name) ? 'chip on' : 'chip'} disabled={full && !has(name)} onClick={() => toggle(name, p)} aria-pressed={has(name)}>
                  {name}
                </button>
              ))}
            </div>
          </div>
        ))}
        <form className="add-habit" onSubmit={addOwn}>
          <input value={own} onChange={(e) => setOwn(e.target.value)} placeholder="Or your own habit" aria-label="Your own habit" disabled={full} />
          <select value={ownPillar} onChange={(e) => setOwnPillar(e.target.value as Pillar)} aria-label="Pillar" disabled={full}>
            {PILLARS.map((p) => (
              <option key={p} value={p}>
                {PILLAR_INFO[p].name}
              </option>
            ))}
          </select>
          <button className="btn" type="submit" disabled={full || !own.trim()}>
            Add
          </button>
        </form>
        {full && <p className="tiny muted">That's three. More can come once these settle in.</p>}
      </section>

      {picked.length > 0 && (
        <section className="panel">
          <h2>Make each one easy to keep</h2>
          <p className="muted tiny">Small is the version you could do on your worst day: traveling, sick, or at 11:58 pm. It counts in full. Usual and Big are optional.</p>
          {picked.map((h, i) => (
            <div key={h.name} className="onboard-sizes">
              <div className="pillar-label">
                <PillarIcon pillar={h.pillar} size={28} />
                <strong>{h.name}</strong>
                <button className="link-btn" onClick={() => toggle(h.name, h.pillar)}>
                  Remove
                </button>
              </div>
              <SizeFields idPrefix={`start-${i}`} value={h} onChange={(v) => setPicked((list) => list.map((x) => (x.name === h.name ? { ...x, ...v } : x)))} />
            </div>
          ))}
        </section>
      )}

      <button className="btn primary big" onClick={start} disabled={busy || !ready}>
        {busy ? 'Building…' : picked.length > 0 && !ready ? 'Add a Small version to each' : 'Found my town'}
      </button>
    </div>
  );
}
