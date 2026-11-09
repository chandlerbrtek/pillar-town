import { useEffect, useMemo, useRef, useState } from 'react';
import { longDate } from '../dates';
import { buildingName, levelFor, type Level } from '../iso/buildings';
import { IslandCanvas, type Transition } from '../iso/IslandCanvas';
import { DAY_LAMP_ID, dayPillarId, renderDay } from '../iso/scenes';
import type { Rendered } from '../iso/engine';
import { PILLAR_INFO } from '../pillars';
import type { DayBlock } from '../town';
import { PILLARS } from '../types';

/**
 * One day's block: its island, a lamp badge, and what each lot holds when tapped.
 * With `pinnable`, a small copy of the island pins under the top bar once the card scrolls away,
 * so animations stay in view while you log habits further down.
 */
export function DayCard({ day, title, pinnable = false }: { day: DayBlock; title?: string; pinnable?: boolean }) {
  const key = JSON.stringify(day);
  const img = useMemo(() => renderDay(day), [key]);
  const [selected, setSelected] = useState<number | null>(null);

  // Compare with the last render of this same day to animate what changed.
  const prev = useRef<{ day: DayBlock; img: Rendered } | null>(null);
  const nextKey = useRef(0);
  const transition = useMemo<Transition | null>(() => {
    const before = prev.current;
    if (!before || before.day.day !== day.day || before.img === img) return null;
    const steps: Transition['steps'] = [];
    const grown = PILLARS.find((p) => day.counts[p] === before.day.counts[p] + 1);
    let ground: Rendered | undefined;
    if (grown) {
      const count = day.counts[grown];
      const kind = count === 1 ? 'drop' : count <= 3 ? 'evolve' : 'hop';
      steps.push({ id: dayPillarId(grown), kind });
      // For a hop, draw the island without that building so it really leaves the ground.
      if (kind === 'hop') ground = renderDay({ ...day, counts: { ...day.counts, [grown]: 0 } }, 64, { hideLot: grown });
    }
    if (day.balanced && !before.day.balanced) steps.push({ id: DAY_LAMP_ID, kind: 'flicker' });
    return steps.length ? { key: ++nextKey.current, at: performance.now(), from: before.img, ground, steps } : null;
  }, [img]);
  useEffect(() => {
    prev.current = { day, img };
  }, [img]);
  const left = Math.max(0, day.lampNeed - day.pillarsTouched);

  const sky = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    if (!pinnable || !sky.current) return;
    const bar = document.querySelector('.topbar') as HTMLElement | null;
    const topbar = bar?.offsetHeight ?? 0;
    document.documentElement.style.setProperty('--topbar-h', `${topbar}px`);
    // Pin once most of the island has scrolled up under the top bar.
    const check = () => {
      const rect = sky.current?.getBoundingClientRect();
      if (rect) setPinned(rect.bottom - topbar < rect.height * 0.35);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [pinnable]);

  const mini = useMemo(() => (pinnable ? cropToIsland(img) : null), [img, pinnable]);
  const miniTransition = useMemo(
    () =>
      transition && mini
        ? { ...transition, from: crop(transition.from, mini.rect), ground: transition.ground && crop(transition.ground, mini.rect) }
        : null,
    [transition, mini],
  );

  return (
    <>
    {pinned && mini && (
      <button className="mini-island" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Scroll up to today's block">
        <IslandCanvas img={mini.img} selected={null} onSelect={() => {}} transition={miniTransition} label="Today's block" maxScale={2} />
        <span className="mini-status">
          {day.balanced ? 'Lamp lit' : `${day.pillarsTouched}/8 · ${left} to lamp`}
        </span>
      </button>
    )}
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
      <div className="sky" ref={sky}>
        <IslandCanvas
          img={img}
          selected={selected}
          onSelect={setSelected}
          transition={transition}
          label={`${longDate(day.day)}: ${day.pillarsTouched} of 8 pillars`}
        />
      </div>
      <p className="tile-detail">{selected ? describe(day, selected) : 'Tap a lot to see what it holds.'}</p>
    </section>
    </>
  );
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function crop(src: Rendered, r: Rect): Rendered {
  const pixels = new Uint32Array(r.w * r.h), ids = new Uint16Array(r.w * r.h), objIds = new Uint16Array(r.w * r.h);
  for (let y = 0; y < r.h; y++)
    for (let x = 0; x < r.w; x++) {
      const sx = x + r.x, sy = y + r.y;
      if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) continue;
      const i = sy * src.width + sx, o = y * r.w + x;
      pixels[o] = src.pixels[i];
      ids[o] = src.ids[i];
      objIds[o] = src.objIds[i];
    }
  return { width: r.w, height: r.h, pixels, ids, objIds };
}

/** Crops a day render to the island's grass top and buildings, with room above for a building to drop in. */
function cropToIsland(img: Rendered): { img: Rendered; rect: Rect } {
  let x0 = img.width, x1 = 0, y0 = img.height, y1 = 0;
  for (let i = 0; i < img.pixels.length; i++) {
    if (!img.pixels[i]) continue;
    const x = i % img.width, y = (i - x) / img.width;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  // The whole island, with room above for a building to drop in.
  const top = Math.max(0, y0 - 18);
  const rect = { x: x0 - 2, y: top, w: x1 - x0 + 5, h: y1 - top + 3 };
  return { img: crop(img, rect), rect };
}

function describe(day: DayBlock, id: number): string {
  if (id === DAY_LAMP_ID) {
    return day.balanced
      ? `Lamp lit: ${day.pillarsTouched} pillars touched. A balanced day.`
      : `The lamp lights at ${day.lampNeed} pillar${day.lampNeed > 1 ? 's' : ''}. ${day.pillarsTouched} so far.`;
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
