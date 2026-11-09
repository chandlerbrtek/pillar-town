import { useEffect, useMemo, useRef, useState } from 'react';
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
  actions: Actions;
}

/** A week's yard up close. On the current week, open spots can be decorated from the shop. */
export function YardCard({ weekStart, isCurrent, items, balance, actions }: Props) {
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
        <IslandCanvas img={img} selected={selected} onSelect={setSelected} transition={transition} label="Yard" />
      </div>
      {cell === null && (
        <p className="tile-detail">
          {isCurrent ? 'Tap an open spot to decorate it.' : 'Decorations stay with the week they were placed in.'}
        </p>
      )}
      {placed && (
        <div className="tile-detail yard-detail">
          <span>
            {findDecor(placed.decor)?.name ?? placed.decor} · {placed.price} seeds
          </span>
          {isCurrent && (
            <button className="btn" onClick={() => remove(placed)}>
              Remove (+{placed.price})
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
        </div>
      )}
      {cell !== null && !placed && !isCurrent && <p className="tile-detail">Only this week's yard can be decorated.</p>}
    </section>
  );
}
