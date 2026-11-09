import { useEffect, useMemo, useRef } from 'react';
import { animFrame } from '../collection/art';
import { animLayers, critterIcon } from '../collection/icons';
import type { Critter } from '../collection/roster';
import { paint } from '../iso/scenes';

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** A critter on its tile. Legendaries and mythics animate unless `still` or reduced motion is on. */
export function CritterView({ critter, silhouette = false, still = false, className }: { critter: Critter; silhouette?: boolean; still?: boolean; className?: string }) {
  const animated = !still && !silhouette && (critter.rarity === 'legendary' || critter.rarity === 'mythic') && !reducedMotion();
  const ref = useRef<HTMLCanvasElement>(null);
  const layers = useMemo(() => (animated ? animLayers(critter) : null), [animated, critter]);

  useEffect(() => {
    if (!layers || !ref.current) return;
    const kind = critter.rarity === 'mythic' ? 'mythic' : 'legendary';
    let t = 0;
    paint(ref.current, animFrame(layers, t, kind));
    const id = window.setInterval(() => {
      t = (t + 0.04) % 1;
      if (ref.current) paint(ref.current, animFrame(layers, t, kind));
    }, 80);
    return () => window.clearInterval(id);
  }, [layers, critter.rarity]);

  if (layers) return <canvas ref={ref} className={`critter ${className ?? ''}`} aria-label={critter.name} />;
  return <img className={`critter ${className ?? ''}`} src={critterIcon(critter, silhouette)} alt={silhouette ? 'Unknown critter' : critter.name} />;
}
