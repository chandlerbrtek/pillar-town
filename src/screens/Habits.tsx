import { useState } from 'react';
import { today, weekStart } from '../dates';
import { PILLAR_INFO } from '../pillars';
import { PillarIcon } from '../iso/IsoIcon';
import { supabase } from '../supabaseStore';
import { targetFor } from '../town';
import { PILLARS, type AppData, type Habit, type Pillar } from '../types';
import type { Actions } from '../useData';

interface Props {
  data: AppData;
  actions: Actions;
  storeKind: 'local' | 'supabase';
  account?: string;
}

export function Habits({ data, actions, storeKind, account }: Props) {
  const week = weekStart(today());
  const [name, setName] = useState('');
  const [pillar, setPillar] = useState<Pillar>('vitality');
  const archived = data.habits.filter((h) => h.archived);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    actions.addHabit(name.trim(), pillar);
    setName('');
  };

  return (
    <div className="stack">
      <section className="panel">
        <h2>Weekly targets</h2>
        <p className="muted tiny">How many habits per week each pillar needs. Changes apply from this week on.</p>
        <ul className="targets">
          {PILLARS.map((p) => {
            const t = targetFor(data.targets, p, week);
            return (
              <li key={p}>
                <PillarIcon pillar={p} size={26} />
                <span className="balance-name">{PILLAR_INFO[p].name}</span>
                <div className="stepper">
                  <button onClick={() => actions.setTarget(p, Math.max(0, t - 1))} aria-label={`Lower ${PILLAR_INFO[p].name} target`}>
                    −
                  </button>
                  <span>{t}</span>
                  <button onClick={() => actions.setTarget(p, Math.min(50, t + 1))} aria-label={`Raise ${PILLAR_INFO[p].name} target`}>
                    +
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel">
        <h2>Habits</h2>
        <form className="add-habit" onSubmit={add}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New habit" aria-label="New habit name" />
          <select value={pillar} onChange={(e) => setPillar(e.target.value as Pillar)} aria-label="Pillar">
            {PILLARS.map((p) => (
              <option key={p} value={p}>
                {PILLAR_INFO[p].name}
              </option>
            ))}
          </select>
          <button className="btn primary" type="submit">
            Add
          </button>
        </form>
        {PILLARS.map((p) => {
          const list = data.habits.filter((h) => h.pillar === p && !h.archived);
          if (list.length === 0) return null;
          return (
            <div key={p} className="habit-edit-group">
              <h3 style={{ color: PILLAR_INFO[p].color }}>{PILLAR_INFO[p].name}</h3>
              {list.map((h) => (
                <HabitEditor key={h.id} habit={h} onSave={actions.saveHabit} />
              ))}
            </div>
          );
        })}
        {archived.length > 0 && (
          <details className="archived">
            <summary>Archived ({archived.length})</summary>
            {archived.map((h) => (
              <div key={h.id} className="habit-edit">
                <span>
                  {h.name} <span className="tiny muted">· {PILLAR_INFO[h.pillar].name}</span>
                </span>
                <button className="btn" onClick={() => actions.saveHabit({ ...h, archived: false })}>
                  Restore
                </button>
              </div>
            ))}
          </details>
        )}
      </section>

      <section className="panel">
        <h2>Storage</h2>
        {storeKind === 'supabase' ? (
          <>
            <p className="muted tiny">Synced with Supabase as {account}.</p>
            <button className="btn" onClick={() => supabase?.auth.signOut()}>
              Sign out
            </button>
          </>
        ) : (
          <p className="muted tiny">Saved in this browser only. Connect Supabase to sync across devices.</p>
        )}
      </section>
    </div>
  );
}

function HabitEditor({ habit, onSave }: { habit: Habit; onSave: (h: Habit) => void }) {
  const [name, setName] = useState(habit.name);
  const commit = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== habit.name) onSave({ ...habit, name: trimmed });
    else setName(habit.name);
  };
  return (
    <div className="habit-edit">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        aria-label={`Rename ${habit.name}`}
      />
      <button className="btn" onClick={() => onSave({ ...habit, archived: true })}>
        Archive
      </button>
    </div>
  );
}
