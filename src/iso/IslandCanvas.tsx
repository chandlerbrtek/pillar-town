import { useEffect, useMemo, useRef } from 'react';
import type { IsoItem } from './buildings';
import { paint, renderIsland } from './scenes';

interface Props {
  items: IsoItem[];
  selected: number | null;
  onSelect: (index: number | null) => void;
  label: string;
}

/** A week drawn as a floating island. Tapping a building selects it. */
export function IslandCanvas({ items, selected, onSelect, label }: Props) {
  const key = JSON.stringify(items);
  const img = useMemo(() => renderIsland(items), [key]);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (selected === null) {
      paint(ref.current, img);
      return;
    }
    // Tint the selected item's pixels gold.
    const pixels = img.pixels.slice();
    const id = selected + 1;
    for (let i = 0; i < pixels.length; i++) {
      if (img.ids[i] !== id || !pixels[i]) continue;
      const v = pixels[i];
      const r = v & 255, g = (v >> 8) & 255, b = (v >> 16) & 255;
      pixels[i] = ((255 << 24) | (Math.round(b + (72 - b) * 0.35) << 16) | (Math.round(g + (201 - g) * 0.35) << 8) | Math.round(r + (247 - r) * 0.35)) >>> 0;
    }
    paint(ref.current, { ...img, pixels });
  }, [img, selected]);

  const tap = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * img.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * img.height);
    const id = img.ids[y * img.width + x] ?? 0;
    onSelect(id === 0 || id - 1 === selected ? null : id - 1);
  };

  return (
    <canvas
      ref={ref}
      className="island"
      style={{ maxWidth: img.width * 3 }}
      onClick={tap}
      role="img"
      aria-label={label}
    />
  );
}
