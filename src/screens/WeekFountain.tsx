import { plazaUrl } from '../iso/scenes';
import { PILLAR_INFO } from '../pillars';
import { trickleAt, WEEKLY_TARGET, type WeekBlock } from '../town';
import { PILLARS } from '../types';

/** A week's plaza fountain, and each pillar's days toward the next stage. */
export function WeekFountain({ week }: { week: WeekBlock }) {
  const pillars = PILLARS.filter((p) => week.progress[p].target > 0);
  if (pillars.length === 0) return null;
  const flowing = week.fountain === 2;
  // Count toward the next stage: trickling while dry, flowing after that.
  const goal = (p: (typeof pillars)[number]) => (week.fountain === 0 ? trickleAt(week.progress[p].target) : week.progress[p].target);
  const text = flowing
    ? 'Flowing! Every pillar reached its goal.'
    : !week.isCurrent
      ? week.fountain === 1
        ? 'Trickling: every pillar got past halfway that week.'
        : 'Dry: not every pillar got past halfway that week.'
      : week.fountain === 1
        ? `Trickling! It flows once each pillar reaches ${WEEKLY_TARGET} days.`
        : `Dry for now. It trickles once each pillar has ${trickleAt(WEEKLY_TARGET)} days.`;
  return (
    <section className="week-fountain">
      <img src={plazaUrl(week.fountain)} alt="" />
      <div>
        <h3>{week.isCurrent ? "This week's fountain" : 'The fountain'}</h3>
        <p>{text}</p>
        {!flowing && (
          <ul className="fountain-pillars">
            {pillars.map((p) => {
              const n = Math.min(week.progress[p].count, goal(p));
              const done = n >= goal(p);
              return (
                <li key={p} className={done ? 'done' : ''}>
                  <b style={{ color: PILLAR_INFO[p].color }}>{PILLAR_INFO[p].name}</b>
                  <span>
                    {n}/{goal(p)}
                    {done ? ' ✓' : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="tiny muted">
          Goal: {WEEKLY_TARGET} days a week in each pillar with a habit. It trickles at {trickleAt(WEEKLY_TARGET)}, flows at {WEEKLY_TARGET}.
        </p>
      </div>
    </section>
  );
}
