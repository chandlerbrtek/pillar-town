import { memo } from 'react';
import type { Pillar } from './types';

// 12x12 pixel sprites. Each character is one pixel:
// '.' is transparent, 'A' is the variant accent color, 'B' is a darker accent,
// and every other letter comes from PALETTE.
const PALETTE: Record<string, string> = {
  k: '#2b2340', // outline
  w: '#f2d6a2', // wall
  W: '#fff8e7', // highlight
  g: '#5a9e4b', // leaf
  t: '#8a5a34', // wood / soil
  T: '#5e3b22', // dark soil
  d: '#4a2e1a', // door
  b: '#7ec8e3', // window
  y: '#f7e26b', // warm light
  o: '#e8913a', // orange
  p: '#f2a7c3', // blossom
  s: '#b7b3c4', // stone
  S: '#6a6a78', // dark stone
  c: '#4fb3d9', // water
  x: '#4e3a2a', // dead wood
};

const SPRITES = {
  vitality: [
    '....kkkk....',
    '..kkAAAAkk..',
    '.kAAAAAAAAk.',
    '.kAAWAAAAAk.',
    'kAAAAAAAAAAk',
    'kAAAAAAABAAk',
    'kABAAAAAAAAk',
    '.kAAAABAAAk.',
    '..kkAAAAkk..',
    '....kttk....',
    '....kttk....',
    '...kkkkkk...',
  ],
  mind: [
    '....kkkk....',
    '..kkAAAAkk..',
    'kkAAAAAAAAkk',
    'kkkkkkkkkkkk',
    '.kwyyyyyywk.',
    '.kswswswswk.',
    '.kswswswswk.',
    '.kswsddswsk.',
    '.kswsddswsk.',
    '.kswsddswsk.',
    'kssssssssssk',
    'kkkkkkkkkkkk',
  ],
  heart: [
    '............',
    '.kk......kk.',
    'kAAk....kAAk',
    'kAyAk..kAyAk',
    '.kAk....kAk.',
    '..g......g..',
    '...kkkkkk...',
    '..kccWcccck.',
    '.kccccccWcck',
    '..kccccccck.',
    '...kkkkkk...',
    '............',
  ],
  spirit: [
    'kkkkkkkkkkkk',
    'kAAAAAAAAAAk',
    'kkkkkkkkkkkk',
    '..kAk..kAk..',
    '.kkkkkkkkkk.',
    '..kAkkkkAk..',
    '..kAkyykAk..',
    '..kAkyykAk..',
    '..kAkkkkAk..',
    '..kAk..kAk..',
    '..kBk..kBk..',
    '.kkkk..kkkk.',
  ],
  bond: [
    '.....kk.....',
    '....kAAk....',
    '...kAAAAk...',
    '..kAAAAAAk..',
    '.kAAAAAAAAk.',
    'kkkkkkkkkkkk',
    '.kwwwwwwwwk.',
    '.kwyywwyywk.',
    '.kwyywwyywk.',
    '.kwwkkkkwwk.',
    '.kwwkddkwwk.',
    'kkkkkkkkkkkk',
  ],
  craft: [
    '.....kk.....',
    '....kAAk....',
    '...kAAAAk...',
    '...kkkkkk...',
    '...kWWWWk...',
    '...kWWkWk...',
    '...kWkkWk...',
    '...kWWWWk...',
    '..kkkkkkkk..',
    '..kBBbbBBk..',
    '..kBBddBBk..',
    '.kkkkkkkkkk.',
  ],
  fortune: [
    '............',
    'kkkkkkkkkkkk',
    'kAWAWAWAWAWk',
    'kAWAWAWAWAWk',
    '.AkAkAkAkAk.',
    '.k........k.',
    '.k........k.',
    '.kkkkkkkkkk.',
    '.kyyoyyoyyk.',
    '.kttttttttk.',
    '.kt......tk.',
    '.kk......kk.',
  ],
  harmony: [
    '............',
    '.g..g..g..g.',
    'gAggAggAggAg',
    '.g..g..g..g.',
    'tttttttttttt',
    'TTTTTTTTTTTT',
    '.g..g..g..g.',
    'gAggAggAggAg',
    '.g..g..g..g.',
    'tttttttttttt',
    'TTTTTTTTTTTT',
    '............',
  ],
  wilted: [
    '............',
    '...x....x...',
    '....x..x....',
    '.x...xx...x.',
    '..x..xx..x..',
    '...xxxxxx...',
    '.....xx.....',
    '.....xx.....',
    '.....xx.....',
    '....xxxx....',
    '..TTTTTTTT..',
    '............',
  ],
  blossom: [
    '............',
    '....kkkk....',
    '...kpppWk...',
    '..kpppppppk.',
    '..kppWpppppk',
    '..kpppppppk.',
    '...kpppppk..',
    '....kkkkk...',
    '.....tt.....',
    '.....tt.....',
    '..gggggggg..',
    '............',
  ],
  fountain: [
    '.....cc.....',
    '....cWWc....',
    '.....cc.....',
    '....kssk....',
    '..c.kssk.c..',
    '.c..kssk..c.',
    'kkkkkkkkkkkk',
    'kccWccccWcck',
    'kcccccccccck',
    'kssssssssssk',
    '.kkkkkkkkkk.',
    '............',
  ],
} satisfies Record<string, string[]>;

export type SpriteName = keyof typeof SPRITES;

export const BUILDING_NAMES: Record<Pillar, string> = {
  vitality: 'Tree',
  mind: 'Library',
  heart: 'Flower pond',
  spirit: 'Shrine gate',
  bond: 'House',
  craft: 'Clock tower',
  fortune: 'Market stall',
  harmony: 'Garden',
};

/** Accent colors each pillar's building can come in. */
export const ACCENTS: Record<Pillar, string[]> = {
  vitality: ['#5a9e4b', '#3f8f5a', '#7bb661'],
  mind: ['#4f7cc9', '#3a5fa8', '#6a9be0'],
  heart: ['#e889a8', '#e85d5d', '#f2c94c'],
  spirit: ['#c8553d', '#9b6fd1', '#d9668f'],
  bond: ['#c8553d', '#e8913a', '#4f7cc9'],
  craft: ['#a0522d', '#6a7a8a', '#8a6a4f'],
  fortune: ['#c8553d', '#3fa7a0', '#e8913a'],
  harmony: ['#e8913a', '#c8553d', '#9b6fd1'],
};

function darken(hex: string, amount = 0.3): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 255) * (1 - amount));
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

interface SpriteProps {
  name: SpriteName;
  accent?: string;
  size?: number;
  title?: string;
}

/** Draws a sprite as SVG rects, merging same-color runs in each row. */
export const Sprite = memo(function Sprite({ name, accent = '#888888', size = 36, title }: SpriteProps) {
  const rows = SPRITES[name];
  const colors: Record<string, string> = { ...PALETTE, A: accent, B: darken(accent) };
  const rects: React.ReactElement[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      if (ch !== '.') {
        rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={end - x} height={1} fill={colors[ch]} />);
      }
      x = end;
    }
  });
  return (
    <svg
      viewBox="0 0 12 12"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className="sprite"
    >
      {rects}
    </svg>
  );
});

export function PillarSprite({ pillar, variant = 0, size }: { pillar: Pillar; variant?: number; size?: number }) {
  const accents = ACCENTS[pillar];
  return <Sprite name={pillar} accent={accents[variant % accents.length]} size={size} />;
}
