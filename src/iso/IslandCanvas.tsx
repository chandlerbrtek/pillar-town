import { useEffect, useRef } from 'react';
import type { Rendered } from './engine';
import { paint } from './scenes';

interface Props {
  img: Rendered;
  /** The tap id currently highlighted, or null. */
  selected: number | null;
  onSelect: (id: number | null) => void;
  label: string;
  maxScale?: number;
}

/** A rendered island. Tapping returns the id of what was tapped; the selected area is tinted gold. */
export function IslandCanvas({ img, selected, onSelect, label, maxScale = 3 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (selected === null) {
      paint(ref.current, img);
      return;
    }
    const pixels = img.pixels.slice();
    for (let i = 0; i < pixels.length; i++) {
      if (img.ids[i] !== selected || !pixels[i]) continue;
      const v = pixels[i];
      const r = v & 255, g = (v >> 8) & 255, b = (v >> 16) & 255;
      pixels[i] = ((255 << 24) | (Math.round(b + (72 - b) * 0.3) << 16) | (Math.round(g + (201 - g) * 0.3) << 8) | Math.round(r + (247 - r) * 0.3)) >>> 0;
    }
    paint(ref.current, { ...img, pixels });
  }, [img, selected]);

  const tap = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * img.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * img.height);
    const id = img.ids[y * img.width + x] ?? 0;
    onSelect(id === 0 || id === selected ? null : id);
  };

  return <canvas ref={ref} className="island" style={{ maxWidth: img.width * maxScale }} onClick={tap} role="img" aria-label={label} />;
}
