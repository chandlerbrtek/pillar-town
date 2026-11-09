import type { Pillar } from '../types';
import type { IsoItem, Level } from './buildings';
import { iconUrl } from './scenes';

/** A small isometric building on a grass tile. */
export function IsoIcon({ item, size = 32 }: { item: IsoItem; size?: number }) {
  return <img className="iso-icon" src={iconUrl(item)} width={size} alt="" aria-hidden />;
}

export function PillarIcon({ pillar, level = 2, variant = 0, size }: { pillar: Pillar; level?: Level; variant?: number; size?: number }) {
  return <IsoIcon item={{ kind: pillar, level, variant }} size={size} />;
}
