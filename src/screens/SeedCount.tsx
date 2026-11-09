import { IsoIcon } from '../iso/IsoIcon';

/** A seed amount with the little sprout icon. */
export function SeedCount({ value, plain = false }: { value: number; plain?: boolean }) {
  return (
    <span className={plain ? 'seed-count plain' : 'seed-count'} aria-label={`${value} seeds`}>
      <IsoIcon item={{ kind: 'seed' }} size={18} />
      {value}
    </span>
  );
}
