import { PillarIcon } from '../iso/IsoIcon';
import { PILLAR_INFO } from '../pillars';
import type { Town, WeekBlock } from '../town';
import { PILLARS } from '../types';

/** Progress toward each pillar's weekly target, with focus and wilted tags. */
export function WeekTargets({ week, town }: { week: WeekBlock; town: Town }) {
  const remaining = PILLARS.reduce((n, p) => n + Math.max(0, week.progress[p].target - week.progress[p].count), 0);
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>This week's targets</h2>
        {week.fullWeek ? <span className="badge gold">Full week!</span> : <span className="tiny muted">{remaining} to go for a full week</span>}
      </div>
      <ul className="balance">
        {PILLARS.map((p) => {
          const { count, target } = week.progress[p];
          const pct = target > 0 ? Math.min(1, count / target) : count > 0 ? 1 : 0;
          const info = PILLAR_INFO[p];
          return (
            <li key={p}>
              <PillarIcon pillar={p} size={26} />
              <span className="balance-name">{info.name}</span>
              <span className="bar" aria-hidden>
                <span style={{ width: `${pct * 100}%`, background: info.color }} />
              </span>
              <span className="balance-count">
                {count}/{target}
              </span>
              <span className="balance-tags">
                {town.weakest === p && <span className="badge focus">Focus</span>}
                {town.openWilted[p] > 0 && <span className="badge wilt">{town.openWilted[p]} wilted</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
