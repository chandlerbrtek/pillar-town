import { useEffect, useLayoutEffect, useRef } from 'react';
import { BASE_FLAG, type Rendered } from './engine';
import { paint } from './scenes';
import { sfx } from '../sound';

/** An animation from a previous render to the current one. */
export interface Transition {
  /** Changes for each new animation. */
  key: number;
  /** When it was created (performance.now), so a canvas that mounts later doesn't replay it. */
  at: number;
  from: Rendered;
  /** The picture without the moving building, for a hop where the building leaves the ground. */
  ground?: Rendered;
  /** Played in order: a building dropping in, or the lamp flickering on. */
  steps: { id: number; kind: 'drop' | 'hop' | 'evolve' | 'flicker' | 'bob' }[];
}

interface Props {
  img: Rendered;
  /** The tap id currently highlighted, or null. */
  selected: number | null;
  onSelect: (id: number | null) => void;
  label: string;
  maxScale?: number;
  transition?: Transition | null;
}

const DURATION = { drop: 420, hop: 260, evolve: 1100, flicker: 560, bob: 520 };
const DUST = 0xffe8f4ff; // pale dust puff (ABGR)

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** A rendered island. Tapping returns the id of what was tapped; the selected area is tinted gold. */
export function IslandCanvas({ img, selected, onSelect, label, maxScale = 3, transition }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const animating = useRef(false);
  // Read by animations, which outlive the render that started them.
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const paintSelected = () => {
    if (!ref.current) return;
    const pixels = img.pixels.slice();
    tint(pixels, img.ids, selectedRef.current);
    paint(ref.current, { ...img, pixels });
  };

  // Runs before the normal paint below, so the final picture never flashes before the animation.
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!transition || !canvas || reducedMotion() || performance.now() - transition.at > 400) return;
    const { from, steps, ground } = transition;
    if (from.width !== img.width || from.height !== img.height || steps.length === 0) return;
    if (ground && (ground.width !== img.width || ground.height !== img.height)) return;
    animating.current = true;
    let raf = 0;
    let stepIndex = 0;
    let stepStart = performance.now();
    const ctx = canvas.getContext('2d')!;
    canvas.width = img.width;
    canvas.height = img.height;
    const frame = ctx.createImageData(img.width, img.height);
    const out = new Uint32Array(frame.data.buffer);

    const tick = (now: number) => {
      const step = steps[stepIndex];
      const t = Math.min(1, (now - stepStart) / DURATION[step.kind]);
      if (step.kind === 'flicker') drawFlicker(out, from, img, step.id, t);
      else if (step.kind === 'evolve') drawEvolve(out, from, img, step.id, t);
      else if (step.kind === 'bob') drawBob(out, transition.ground ?? from, img, step.id, t);
      else drawDrop(out, step.kind === 'hop' && transition.ground ? transition.ground : from, img, step.id, t, step.kind === 'hop' ? 6 : 16);
      tint(out, img.ids, selectedRef.current);
      ctx.putImageData(frame, 0, 0);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
        return;
      }
      stepIndex++;
      if (stepIndex < steps.length) {
        stepStart = now;
        raf = requestAnimationFrame(tick);
        return;
      }
      animating.current = false;
      paintSelected();
    };
    tick(performance.now());
    return () => {
      cancelAnimationFrame(raf);
      animating.current = false;
    };
    // Only a new transition starts an animation.
  }, [transition?.key]);

  useEffect(() => {
    if (!animating.current) paintSelected();
  }, [img, selected]);

  const tap = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * img.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * img.height);
    const id = img.ids[y * img.width + x] ?? 0;
    const next = id === 0 || id === selected ? null : id;
    if (next !== null) sfx.tap();
    onSelect(next);
  };

  return <canvas ref={ref} className="island" style={{ maxWidth: img.width * maxScale }} onClick={tap} role="img" aria-label={label} />;
}

/** Tints the selected area gold, in place. */
function tint(pixels: Uint32Array, ids: Uint16Array, selected: number | null) {
  if (selected === null) return;
  for (let i = 0; i < pixels.length; i++) {
    if (ids[i] !== selected || !pixels[i]) continue;
    const v = pixels[i];
    const r = v & 255, g = (v >> 8) & 255, b = (v >> 16) & 255;
    pixels[i] = ((255 << 24) | (Math.round(b + (72 - b) * 0.3) << 16) | (Math.round(g + (201 - g) * 0.3) << 8) | Math.round(r + (247 - r) * 0.3)) >>> 0;
  }
}

/**
 * The previous picture with the new building falling onto it.
 * It drops from `height` pixels up, lands, bounces once, and kicks up a puff of dust.
 */
function drawDrop(out: Uint32Array, from: Rendered, to: Rendered, id: number, t: number, height: number) {
  const { width: w } = to;
  out.set(from.pixels);
  // Fall for the first 60%, then a small bounce.
  let offset: number;
  if (t < 0.6) offset = -Math.round(height * (1 - (t / 0.6) ** 2));
  else offset = -Math.round(Math.sin(((t - 0.6) / 0.4) * Math.PI) * Math.max(1, height * 0.15));
  let x0 = w, x1 = 0, y1 = 0;
  for (let i = 0; i < to.pixels.length; i++) {
    if ((to.objIds[i] & ~BASE_FLAG) !== id || !to.pixels[i]) continue;
    const x = i % w, y = (i - x) / w;
    const ny = y + offset;
    if (ny >= 0 && ny < to.height) out[ny * w + x] = to.pixels[i];
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  // Dust puffs out to both sides just after landing.
  if (t >= 0.6 && t < 0.9 && x1 > x0) {
    const spread = Math.round(((t - 0.6) / 0.3) * 6);
    for (const [dx, dy] of [[-2 - spread, 0], [-1 - spread, -1], [x1 - x0 + 2 + spread, 0], [x1 - x0 + 1 + spread, -1]]) {
      const x = x0 + dx, y = y1 + dy;
      if (x >= 0 && x < w && y >= 0 && y < to.height) out[y * w + x] = DUST;
    }
  }
}

const whiten = (v: number, w: number) => {
  const r = v & 255, g = (v >> 8) & 255, b = (v >> 16) & 255;
  return ((255 << 24) | (Math.round(b + (255 - b) * w) << 16) | (Math.round(g + (255 - g) * w) << 8) | Math.round(r + (255 - r) * w)) >>> 0;
};

/**
 * An evolution: the old building glows white, its shape flickers between old and new
 * faster and faster, then the new building appears as the glow fades, with a few sparkles.
 */
function drawEvolve(out: Uint32Array, from: Rendered, to: Rendered, id: number, t: number) {
  const n = out.length, w = to.width;
  // Background with neither building: the old picture, with ground from the new picture where only the old building stood.
  out.set(from.pixels);
  for (let i = 0; i < n; i++) if (from.objIds[i] === id && to.objIds[i] !== id) out[i] = to.pixels[i];

  let showNew: boolean, glow: number;
  if (t < 0.15) {
    showNew = false;
    glow = (t / 0.15) * 0.85;
  } else if (t < 0.8) {
    const p = (t - 0.15) / 0.65;
    showNew = Math.floor(p * p * 14) % 2 === 1;
    glow = 0.85;
  } else {
    showNew = true;
    glow = 0.85 * (1 - (t - 0.8) / 0.2);
  }
  const src = showNew ? to : from;
  let x0 = w, x1 = 0, y0 = to.height, y1 = 0;
  for (let i = 0; i < n; i++) {
    if (src.objIds[i] !== id || !src.pixels[i]) continue;
    out[i] = whiten(src.pixels[i], glow);
    const x = i % w, y = (i - x) / w;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  // Sparkles around the new building as it appears.
  if (t >= 0.8 && x1 > x0) {
    const s = 0xffffffff;
    const twinkle = Math.floor(t * 30) % 2;
    const spots = twinkle
      ? [[x0 - 3, y0 + 4], [x1 + 3, y0 + 2], [x0 + 2, y0 - 3]]
      : [[x1 + 2, y0 - 2], [x0 - 2, y1 - 6], [x1 + 3, y1 - 8]];
    for (const [sx, sy] of spots)
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = sx + dx, y = sy + dy;
        if (x >= 0 && x < w && y >= 0 && y < to.height) out[y * w + x] = s;
      }
  }
}

/** The current picture with the lamp switching between unlit (previous) and lit a few times, ending lit. */
function drawFlicker(out: Uint32Array, from: Rendered, to: Rendered, id: number, t: number) {
  out.set(to.pixels);
  const pattern = [1, 0, 1, 1, 0, 1, 1, 1];
  const lit = pattern[Math.min(pattern.length - 1, Math.floor(t * pattern.length))] === 1;
  if (lit) return;
  for (let i = 0; i < out.length; i++) {
    if (to.objIds[i] === id || from.objIds[i] === id) out[i] = from.pixels[i];
  }
}

/** A small idle hop: only the critter lifts and lands, its pedestal and the ground stay put. */
function drawBob(out: Uint32Array, ground: Rendered, to: Rendered, id: number, t: number) {
  const { width: w } = to;
  out.set(ground.pixels);
  const offset = -Math.round(Math.sin(t * Math.PI) * 4);
  for (let i = 0; i < to.pixels.length; i++) {
    if (to.objIds[i] !== id || !to.pixels[i]) continue;
    const x = i % w, y = (i - x) / w, ny = y + offset;
    if (ny >= 0 && ny < to.height) out[ny * w + x] = to.pixels[i];
  }
}
