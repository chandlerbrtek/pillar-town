import { useEffect, useMemo, useRef, useState } from 'react';
import { today, weekStart } from '../dates';
import { deriveCollection, GLIMMER_GAIN, PITY, rollCritter, SPIN_COST, WISH_COST, type CollectionState } from '../collection/logic';
import { renderMachine, type MachineState } from '../collection/machine';
import { sealedCapsule } from '../collection/icons';
import { CRITTERS, RARITIES, RARITY_COLOR, RARITY_LABEL, type Critter } from '../collection/roster';
import { capsuleSfx } from '../sound';
import { deriveTown } from '../town';
import type { AppData, PullSource } from '../types';
import type { Actions } from '../useData';
import { CritterView } from './CritterView';
import { SeedCount } from './SeedCount';

type Source = Exclude<PullSource, 'wish'>;
interface Reveal {
  critter: Critter;
  isNew: boolean;
  glimmer: number;
}

const REST = -Math.PI / 2;
const TRAY = { x: 1.66, y: 1.03, z: 0.18 };

export function Collection({ data, actions }: { data: AppData; actions: Actions }) {
  const day = today();
  const town = useMemo(() => deriveTown(data, day), [data, day]);
  const state = useMemo(() => deriveCollection(data, town), [data, town]);
  const seeds = town.seeds.balance;
  const canvas = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [batch, setBatch] = useState<Reveal[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [burst, setBurst] = useState<{ rarity: 'legendary' | 'mythic'; key: number } | null>(null);
  const skip = useRef(false);

  useEffect(() => {
    if (canvas.current) renderMachine(canvas.current, { crank: REST, jiggle: 0 });
  }, []);

  const draw = (s: MachineState) => canvas.current && renderMachine(canvas.current, s);
  const animate = (ms: number, step: (t: number) => void) =>
    new Promise<void>((resolve) => {
      const start = performance.now();
      const tick = () => {
        const t = skip.current ? 1 : Math.min(1, (performance.now() - start) / ms);
        step(t);
        if (t < 1) setTimeout(tick, 33);
        else resolve();
      };
      tick();
    });

  /** Rolls and saves a capsule, then plays the machine. Tapping the machine skips to the reveal. */
  async function spin(source: Source) {
    if (busy) return;
    if (source === 'seeds' && seeds < SPIN_COST) return;
    if (source === 'lamp' && state.lampTokens < 1) return;
    if (source === 'golden' && state.goldenTokens < 1) return;
    setBusy(true);
    setReveal(null);
    setBatch(null);
    skip.current = false;
    const critter = rollCritter(state, source);
    const isNew = !state.owned.has(critter.key);
    actions.addPull({ critter: critter.key, source, seeds: source === 'seeds' ? SPIN_COST : 0, glimmer: 0 });
    const color = source === 'golden' && critter.rarity !== 'mythic' ? '#f2c13a' : RARITY_COLOR[critter.rarity];
    const glows = critter.rarity !== 'common' && critter.rarity !== 'uncommon';

    capsuleSfx.coin();
    await animate(250, () => {});
    let clicks = 0;
    await animate(900, (t) => {
      const q = Math.floor(t * 4);
      if (q > clicks && !skip.current) {
        clicks = q;
        capsuleSfx.crank();
      }
      draw({ crank: REST + t * Math.PI * 2, jiggle: t * 30 });
    });
    if (!skip.current) capsuleSfx.drop();
    await animate(420, (t) => {
      const x = 1.5 + Math.min(1, t / 0.4) * (TRAY.x - 1.5);
      const z = t < 0.7 ? 0.32 - (t / 0.7) ** 2 * 0.14 : TRAY.z + Math.sin(((t - 0.7) / 0.3) * Math.PI) * 0.08;
      draw({ crank: REST, jiggle: 0, drop: { x, y: TRAY.y, z, color, tilt: 0 } });
    });
    const wobbles = { common: 2, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 6 }[critter.rarity];
    for (let w = 0; w < wobbles && !skip.current; w++) {
      capsuleSfx.wobble();
      await animate(260, (t) => {
        const tilt = Math.sin(t * Math.PI * 2) * 0.5;
        draw({ crank: REST, jiggle: 0, drop: { ...TRAY, x: TRAY.x + tilt * 0.04, color, tilt }, glow: glows ? { color, amount: Math.abs(Math.sin(t * Math.PI)) } : undefined });
      });
    }
    capsuleSfx.crack();
    skip.current = false;
    const rainbow = ['#ff7ad9', '#ffb03a', '#7ae8ff', '#b07aff'];
    await animate(critter.rarity === 'mythic' ? 900 : 450, (t) => {
      const flashColor = critter.rarity === 'mythic' ? rainbow[Math.floor(t * 8) % rainbow.length] : glows ? color : '#ffffff';
      draw({ crank: REST, jiggle: 0, drop: { ...TRAY, color, tilt: 0, open: Math.min(1, t * 1.5) }, burst: { color, t }, flash: { color: flashColor, alpha: Math.max(0, 0.7 - t * 0.8) } });
    });
    draw({ crank: REST, jiggle: 0 });
    setReveal({ critter, isNew, glimmer: isNew ? 0 : GLIMMER_GAIN[critter.rarity] });
    capsuleSfx.reveal(critter.rarity);
    if (critter.rarity === 'legendary' || critter.rarity === 'mythic') {
      const key = Date.now();
      setBurst({ rarity: critter.rarity, key });
      setTimeout(() => setBurst((b) => (b?.key === key ? null : b)), critter.rarity === 'mythic' ? 2200 : 1300);
    }
    setBusy(false);
  }

  /** Opens every free capsule of one kind at once, without the animation. */
  function openAll(source: Source) {
    const count = source === 'lamp' ? state.lampTokens : state.goldenTokens;
    if (busy || count < 1) return;
    const local: CollectionState = { ...state, owned: new Map(state.owned) };
    const results: Reveal[] = [];
    for (let i = 0; i < count; i++) {
      const critter = rollCritter(local, source);
      const isNew = !local.owned.has(critter.key);
      local.owned.set(critter.key, (local.owned.get(critter.key) ?? 0) + 1);
      local.sinceLegendary = critter.rarity === 'legendary' || critter.rarity === 'mythic' ? 0 : local.sinceLegendary + 1;
      local.sinceMythic = critter.rarity === 'mythic' ? 0 : local.sinceMythic + 1;
      actions.addPull({ critter: critter.key, source, seeds: 0, glimmer: 0 });
      results.push({ critter, isNew, glimmer: isNew ? 0 : GLIMMER_GAIN[critter.rarity] });
    }
    const best = results.reduce((a, b) => (RARITIES.indexOf(b.critter.rarity) > RARITIES.indexOf(a.critter.rarity) ? b : a));
    capsuleSfx.crack();
    capsuleSfx.reveal(best.critter.rarity);
    setReveal(null);
    setBatch(results);
  }

  function wish(critter: Critter) {
    const cost = WISH_COST[critter.rarity];
    if (state.glimmer < cost || state.owned.has(critter.key)) return;
    actions.addPull({ critter: critter.key, source: 'wish', seeds: 0, glimmer: cost });
    capsuleSfx.wish();
    capsuleSfx.reveal(critter.rarity);
    setSelected(null);
    setBatch(null);
    setReveal({ critter, isNew: true, glimmer: 0 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="stack">
      <section className="panel collection-head">
        <h2>Sprout Machine</h2>
        <div className="wallets">
          <span className="wallet">
            <SeedCount value={seeds} plain />
          </span>
          <span className="wallet glimmer">✦ {state.glimmer}</span>
        </div>
      </section>

      {burst && <div key={burst.key} className={`screen-burst ${burst.rarity}`} aria-hidden />}
      <section className="machine-stage" onClick={() => busy && (skip.current = true)}>
        <canvas ref={canvas} className="machine" aria-label="Capsule machine" />
        <Pity state={state} />
        <div className="machine-buttons">
          <button className="btn primary" disabled={busy || seeds < SPIN_COST} onClick={() => spin('seeds')}>
            Spin · {SPIN_COST} seeds
          </button>
          {state.lampTokens > 0 && (
            <button className="btn free" disabled={busy} onClick={() => spin('lamp')}>
              Free capsule ×{state.lampTokens}
            </button>
          )}
          {state.goldenTokens > 0 && (
            <button className="btn golden" disabled={busy} onClick={() => spin('golden')}>
              Golden capsule ×{state.goldenTokens}
            </button>
          )}
          {state.lampTokens > 1 && (
            <button className="btn ghost" disabled={busy} onClick={() => openAll('lamp')}>
              Open all free
            </button>
          )}
        </div>
        {busy && <p className="tiny muted">Tap the machine to skip</p>}
        {reveal && <RevealCard reveal={reveal} data={data} actions={actions} />}
        {batch && <BatchCard results={batch} />}
      </section>
      <p className="tiny muted">Light the day's lamp for a free capsule; a full week earns a golden one. Duplicates turn into glimmer (✦) for wishing.</p>

      <Book state={state} selected={selected} onSelect={setSelected} onWish={wish} data={data} actions={actions} />
    </div>
  );
}

function Pity({ state }: { state: CollectionState }) {
  return (
    <div className="pity">
      <div className="pity-row">
        <span>Legendary or better within</span>
        <b style={{ color: RARITY_COLOR.legendary }}>{PITY.legendary - state.sinceLegendary} spins</b>
      </div>
      <div className="meter">
        <span style={{ width: `${(state.sinceLegendary / PITY.legendary) * 100}%`, background: RARITY_COLOR.legendary }} />
      </div>
      <div className="pity-row">
        <span>Mythic guaranteed within</span>
        <b style={{ color: RARITY_COLOR.mythic }}>{PITY.mythic - state.sinceMythic} spins</b>
      </div>
      <div className="meter">
        <span style={{ width: `${(state.sinceMythic / PITY.mythic) * 100}%`, background: RARITY_COLOR.mythic }} />
      </div>
    </div>
  );
}

/** Places a critter in the first open spot of this week's yard. */
function usePlace(data: AppData, actions: Actions) {
  const week = weekStart(today());
  const taken = new Set(data.yard.filter((y) => y.weekStart === week).map((y) => y.cell));
  const cell = [0, 1, 2, 3, 4, 5, 6, 7, 8].find((c) => !taken.has(c));
  return {
    full: cell === undefined,
    place: (critter: Critter) => cell !== undefined && actions.buyDecor(week, cell, `critter:${critter.key}`, 0),
  };
}

function RevealCard({ reveal, data, actions }: { reveal: Reveal; data: AppData; actions: Actions }) {
  const { critter, isNew, glimmer } = reveal;
  const { full, place } = usePlace(data, actions);
  const [placed, setPlaced] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [critter]);
  return (
    <div ref={ref} className={`reveal ${critter.rarity}`} onClick={(e) => e.stopPropagation()}>
      {isNew ? <span className="new">NEW!</span> : <span className="dupe">Duplicate → +{glimmer} ✦</span>}
      <CritterView critter={critter} className="big" />
      <div className="r-name">{critter.name}</div>
      <div className="r-rarity" style={{ color: RARITY_COLOR[critter.rarity] }}>
        {RARITY_LABEL[critter.rarity]}
      </div>
      <button
        className="btn"
        disabled={placed || full}
        onClick={() => {
          place(critter);
          setPlaced(true);
        }}
      >
        {placed ? "Placed in this week's yard" : full ? "This week's yard is full" : "Place in this week's yard"}
      </button>
    </div>
  );
}

function BatchCard({ results }: { results: Reveal[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [results]);
  return (
    <div ref={ref} className="reveal batch" onClick={(e) => e.stopPropagation()}>
      <div className="r-name">{results.length} capsules opened</div>
      <div className="batch-grid">
        {results.map((r, i) => (
          <div key={i} className={`batch-item ${r.critter.rarity}`}>
            {r.isNew && <span className="new small">NEW</span>}
            <CritterView critter={r.critter} still />
            <span style={{ color: RARITY_COLOR[r.critter.rarity] }}>{r.critter.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Book({ state, selected, onSelect, onWish, data, actions }: { state: CollectionState; selected: string | null; onSelect: (k: string | null) => void; onWish: (c: Critter) => void; data: AppData; actions: Actions }) {
  const found = CRITTERS.filter((c) => state.owned.has(c.key)).length;
  const pick = CRITTERS.find((c) => c.key === selected);
  const { full, place } = usePlace(data, actions);
  return (
    <section className="panel book">
      <div className="panel-head">
        <h2>Collection</h2>
        <span className="wallet">
          {found} / {CRITTERS.length}
        </span>
      </div>
      {RARITIES.map((rarity) => {
        const tier = CRITTERS.filter((c) => c.rarity === rarity);
        const have = tier.filter((c) => state.owned.has(c.key)).length;
        return (
          <div key={rarity} className="tier">
            <div className="tier-head" style={{ borderColor: RARITY_COLOR[rarity] }}>
              <b style={{ color: RARITY_COLOR[rarity] }}>{RARITY_LABEL[rarity]}</b>
              <span>
                {have}/{tier.length}
              </span>
            </div>
            <div className="tier-grid">
              {tier.map((c) => {
                const got = state.owned.has(c.key);
                const hidden = !got && rarity !== 'common' && rarity !== 'uncommon';
                return (
                  <button key={c.key} className={`slot ${rarity}${got ? ' have' : ''}${selected === c.key ? ' selected' : ''}`} onClick={() => onSelect(selected === c.key ? null : c.key)}>
                    {hidden ? <img src={sealedCapsule(rarity)} alt="Undiscovered" /> : <CritterView critter={c} silhouette={!got} still />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="book-detail">
        {!pick && <span className="muted tiny">Tap a slot. Missing critters can be wished for with glimmer (✦).</span>}
        {pick && state.owned.has(pick.key) && (
          <>
            <CritterView critter={pick} className="detail-critter" />
            <div className="detail-text">
              <b>{pick.name}</b>
              <span style={{ color: RARITY_COLOR[pick.rarity] }}>
                {RARITY_LABEL[pick.rarity]} · ×{state.owned.get(pick.key)}
              </span>
              <button className="btn" disabled={full} onClick={() => place(pick)}>
                {full ? 'Yard is full' : 'Place in yard'}
              </button>
            </div>
          </>
        )}
        {pick && !state.owned.has(pick.key) && (
          <>
            <span>
              ??? · <span style={{ color: RARITY_COLOR[pick.rarity] }}>{RARITY_LABEL[pick.rarity]}</span>
            </span>
            <button className="btn wish" disabled={state.glimmer < WISH_COST[pick.rarity]} onClick={() => onWish(pick)}>
              Wish · {WISH_COST[pick.rarity]} ✦
            </button>
          </>
        )}
      </div>
    </section>
  );
}
