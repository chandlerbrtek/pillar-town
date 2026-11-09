import { plazaUrl } from '../iso/scenes';
import type { WeekBlock } from '../town';
import { PILLARS } from '../types';

/** This week's plaza fountain and how close it is to the next stage. */
export function WeekFountain({ week }: { week: WeekBlock }) {
  let done = 0, needed = 0;
  for (const p of PILLARS) {
    const { count, target } = week.progress[p];
    if (target <= 0) continue;
    done += Math.min(count, target);
    needed += target;
  }
  if (needed === 0) return null;
  const half = Math.ceil(needed / 2);
  const days = (n: number) => `${n} more target day${n === 1 ? '' : 's'}`;
  const text =
    week.fountain === 2
      ? 'Flowing! Every weekly target met.'
      : !week.isCurrent
        ? `${week.fountain === 1 ? 'Trickling' : 'Dry'}: ${done} of ${needed} target days that week.`
        : week.fountain === 1
          ? `Trickling. ${days(needed - done)} and it flows.`
          : `Dry for now. ${days(half - done)} and it starts to trickle.`;
  return (
    <section className="week-fountain">
      <img src={plazaUrl(week.fountain)} alt="" />
      <div>
        <h3>{week.isCurrent ? "This week's fountain" : 'The fountain'}</h3>
        <p>{text}</p>
        <span className="fountain-bar" aria-label={`${done} of ${needed} target days`}>
          <span style={{ width: `${(done / needed) * 100}%` }} />
          <i style={{ left: '50%' }} />
        </span>
      </div>
    </section>
  );
}
