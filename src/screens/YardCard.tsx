import { useEffect, useMemo, useRef, useState } from 'react';
import { findCritter, RARITIES, RARITY_COLOR, RARITY_LABEL, type Critter, type Rarity } from '../collection/roster';
import { CritterView } from './CritterView';
import { shortDate } from '../dates';
import { DECOR, findDecor } from '../iso/decor';
import type { Rendered } from '../iso/engine';
import { IslandCanvas, type Transition } from '../iso/IslandCanvas';
import { IsoIcon } from '../iso/IsoIcon';
import { renderYard, yardCellId } from '../iso/scenes';
import { sfx } from '../sound';
import type { YardItem } from '../types';
import type { Actions } from '../useData';
import { SeedCount } from './SeedCount';

interface Props {
  weekStart: string;
  isCurrent: boolean;
  items: YardItem[];
  balance: number;
  /** Critters found in the capsule machine, placeable for free. */
  critters: Critter[];
  actions: Actions;
}

const CRITTER = 'critter:';
const critterOf = (decor: string) => (decor.startsWith(CRITTER) ? findCritter(decor.slice(CRITTER.length)) : undefined);
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** A week's yard up close. On the current week, open spots can be decorated from the shop. */
export function YardCard({ weekStart, isCurrent, items, balance, critters, actions }: Props) {
  const key = JSON.stringify(items);
  const img = useMemo(() => renderYard(items, isCurrent), [key, isCurrent]);
  const [selected, setSelected] = useState<number | null>(null);
  const cell = selected === null ? null : selected - 1;
  const placed = cell === null ? undefined : items.find((i) => i.cell === cell);

  // Drop a newly bought decoration into place.
  const prev = useRef<{ items: YardItem[]; img: Rendered } | null>(null);
  const nextKey = useRef(0);
  const transition = useMemo<Transition | null>(() => {
    const before = prev.current;
    if (!before || before.img === img) return null;
    const added = items.find((i) => !before.items.some((b) => b.id === i.id));
    return added ? { key: ++nextKey.current, at: performance.now(), from: before.img, steps: [{ id: yardCellId(added.cell), kind: 'drop' }] } : null;
  }, [img]);
  useEffect(() => {
    prev.current = { items, img };
  }, [img]);

  // Critters in the yard hop now and then.
  const [idle, setIdle] = useState<Transition | null>(null);
  useEffect(() => {
    const hoppers = items.filter((i) => critterOf(i.decor));
    if (hoppers.length === 0 || reducedMotion()) return;
    let timer = 0;
    const next = () => {
      timer = window.setTimeout(() => {
        if (!document.hidden) {
          const pick = hoppers[Math.floor(Math.random() * hoppers.length)];
          const ground = renderYard(items.map((i) => (i.id === pick.id ? { ...i, decor: i.decor.replace(CRITTER, 'critter-base:') } : i)), isCurrent);
          setIdle({ key: ++nextKey.current, at: performance.now(), from: img, ground, steps: [{ id: yardCellId(pick.cell), kind: 'bob' }] });
        }
        next();
      }, 3000 + Math.random() * 3000);
    };
    next();
    return () => window.clearTimeout(timer);
  }, [img]);
  const shown = idle && (!transition || idle.key > transition.key) ? idle : transition;

  // Each found critter can stand in one spot of the week's yard.
  const free = critters.filter((c) => !items.some((i) => i.decor === CRITTER + c.key));

  const buy = (id: string, price: number) => {
    if (cell === null) return;
    sfx.buy();
    actions.buyDecor(weekStart, cell, id, price);
    setSelected(null);
  };

  const remove = (item: YardItem) => {
    sfx.undo();
    actions.removeDecor(item.id);
    setSelected(null);
  };

  return (
    <section className="block current">
      <div className="block-head">
        <h3>{isCurrent ? "This week's yard" : `Yard · week of ${shortDate(weekStart)}`}</h3>
        <SeedCount value={balance} />
      </div>
      <div className="sky">
        <IslandCanvas img={img} selected={selected} onSelect={setSelected} transition={shown} label="Yard" />
      </div>
      {cell === null && (
        <p className="tile-detail">
          {isCurrent ? 'Tap an open spot to decorate it.' : 'Decorations stay with the week they were placed in.'}
        </p>
      )}
      {placed && (
        <div className="tile-detail yard-detail">
          <PlacedName decor={placed.decor} price={placed.price} />
          {isCurrent && (
            <button className="btn" onClick={() => remove(placed)}>
              {placed.price > 0 ? `Remove (+${placed.price})` : 'Remove'}
            </button>
          )}
        </div>
      )}
      {cell !== null && !placed && isCurrent && (
        <div className="shop">
          {DECOR.map((d) => (
            <div key={d.id} className={d.price > balance ? 'shop-item locked' : 'shop-item'}>
              <IsoIcon item={{ kind: 'decor', id: d.id }} size={56} />
              <div className="shop-name">{d.name}</div>
              <button className="buy" disabled={d.price > balance} onClick={() => buy(d.id, d.price)}>
                <SeedCount value={d.price} plain />
              </button>
            </div>
          ))}
          {free.length > 0 && <CritterPicker critters={free} onPlace={(c) => buy(CRITTER + c.key, 0)} />}
        </div>
      )}
      {cell !== null && !placed && !isCurrent && <p className="tile-detail">Only this week's yard can be decorated.</p>}
    </section>
  );
}

function PlacedName({ decor, price }: { decor: string; price: number }) {
  const critter = critterOf(decor);
  if (critter)
    return (
      <span>
        {critter.name} · <span style={{ color: RARITY_COLOR[critter.rarity] }}>{RARITY_LABEL[critter.rarity]}</span>
      </span>
    );
  return (
    <span>
      {findDecor(decor)?.name ?? decor} · {price} seeds
    </span>
  );
}

/** Found critters as a compact grid, rarest first, with tier filters. Collapsed until opened. */
function CritterPicker({ critters, onPlace }: { critters: Critter[]; onPlace: (c: Critter) => void }) {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<Rarity | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const tiers = [...RARITIES].reverse().filter((r) => critters.some((c) => c.rarity === r));
  const shown = critters
    .filter((c) => !tier || c.rarity === tier)
    .sort((a, b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity));
  const picked = critters.find((c) => c.key === pick);
  return (
    <div className="critter-picker">
      <button className="picker-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>Your critters · free ({critters.length})</span>
        <span>{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <>
          {tiers.length > 1 && (
            <div className="chips">
              <button className={tier === null ? 'chip on' : 'chip'} onClick={() => setTier(null)}>
                All
              </button>
              {tiers.map((r) => (
                <button key={r} className={tier === r ? 'chip on' : 'chip'} style={{ color: RARITY_COLOR[r] }} onClick={() => setTier(tier === r ? null : r)}>
                  {RARITY_LABEL[r]}
                </button>
              ))}
            </div>
          )}
          <div className="tier-grid picker-grid">
            {shown.map((c) => (
              <button key={c.key} className={`slot have ${c.rarity}${pick === c.key ? ' selected' : ''}`} onClick={() => setPick(pick === c.key ? null : c.key)} aria-label={c.name}>
                <CritterView critter={c} still />
              </button>
            ))}
          </div>
          <div className="picker-bar">
            {picked ? (
              <>
                <span>
                  {picked.name} · <span style={{ color: RARITY_COLOR[picked.rarity] }}>{RARITY_LABEL[picked.rarity]}</span>
                </span>
                <button className="btn" onClick={() => onPlace(picked)}>
                  Place
                </button>
              </>
            ) : (
              <span className="muted tiny">Tap a critter to place it here.</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
