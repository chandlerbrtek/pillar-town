import type { Habit } from '../types';

export type Sizes = Pick<Habit, 'small' | 'usual' | 'big'>;

/** Small (required), Usual and Big inputs for a habit. */
export function SizeFields({ value, onChange, onBlur, idPrefix }: { value: Sizes; onChange: (v: Sizes) => void; onBlur?: () => void; idPrefix: string }) {
  const field = (key: keyof Sizes, label: string, placeholder: string, optional: boolean) => (
    <label className={`size-field ${key}`} htmlFor={`${idPrefix}-${key}`}>
      <span>
        {label}
        {optional ? <i> optional</i> : null}
      </span>
      <input
        id={`${idPrefix}-${key}`}
        value={value[key] ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange({ ...value, [key]: e.target.value })}
        onBlur={onBlur}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
    </label>
  );
  return (
    <div className="size-fields">
      {field('small', 'Small', 'Your worst-day version, e.g. 1 page', false)}
      {field('usual', 'Usual', 'A normal day, e.g. 20 minutes', true)}
      {field('big', 'Big', 'A good day, e.g. 30 minutes', true)}
    </div>
  );
}

/** Trims the fields and drops empty ones. */
export function cleanSizes(v: Sizes): Sizes {
  const t = (s?: string) => (s?.trim() ? s.trim() : undefined);
  return { small: t(v.small), usual: t(v.usual), big: t(v.big) };
}
