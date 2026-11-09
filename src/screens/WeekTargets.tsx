import { PillarIcon } from '../iso/IsoIcon';
import { PILLAR_INFO } from '../pillars';
import { WEEKLY_TARGET, type Town, type WeekBlock } from '../town';
import { PILLARS } from '../types';

/** Progress toward each pillar's weekly target, plus pillar streaks. */
export function WeekTargets({ week, town }: { week: WeekBlock; town: Town }) {
  const remaining = PILLARS.reduce((n, p) => n + Math.max(0, week.progress[p].target - week.progress[p].count), 0);
  // Pillars you haven't started stay out of the way.
  const shown = PILLARS.filter((p) => week.progress[p].target > 0 || week.progress[p].count > 0 || town.streaks[p] > 0);
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>This week's targets</h2>
        {week.fullWeek ? <span className="badge gold">Full week!</span> : <span className="tiny muted">{remaining} to go for a full week</span>}
      </div>
      <p className="tiny muted">The goal: {WEEKLY_TARGET} days a week in each pillar you have a habit in, at any size. Hit them all for a full week.</p>
      <ul className="balance">
        {shown.map((p) => {
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
            </li>
          );
        })}
      </ul>
      <h3 className="streaks-title">Streaks</h3>
      <div className="streaks">
        {shown.map((p) => {
          const n = town.streaks[p];
          const bent = town.bent[p];
          return (
            <span key={p} className={bent ? 'streak bent' : n >= 7 ? 'streak hot' : n === 0 ? 'streak cold' : 'streak'} style={{ borderColor: PILLAR_INFO[p].color }}>
              <b style={{ color: PILLAR_INFO[p].color }}>{PILLAR_INFO[p].name}</b> {n ? `${n} day${n > 1 ? 's' : ''}` : '-'}
              {bent && <span className="bent-note"> · missed yesterday, keep it today</span>}
            </span>
          );
        })}
      </div>
      <p className="tiny muted">Never miss twice: one missed day bends a streak, two in a row end it. Streaks of 7, 30 and 100 days earn bonus seeds.</p>
    </section>
  );
}
