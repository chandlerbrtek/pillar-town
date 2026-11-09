import type { Pillar } from '../types';
import type { IsoItem } from './buildings';
import { iconUrl } from './scenes';

/** A small isometric building on a grass tile. */
export function IsoIcon({ item, size = 32 }: { item: IsoItem; size?: number }) {
  return <img className="iso-icon" src={iconUrl(item)} width={size} alt="" aria-hidden />;
}

export function PillarIcon({ pillar, variant = 0, size }: { pillar: Pillar; variant?: number; size?: number }) {
  return <IsoIcon item={{ kind: pillar, variant }} size={size} />;
}
