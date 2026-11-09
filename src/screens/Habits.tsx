import { useState } from 'react';
import { today, weekStart } from '../dates';
import { PILLAR_INFO } from '../pillars';
import { PillarIcon } from '../iso/IsoIcon';
import { hasRoom, isSettled, MAX_SETTLING, recentDays, settling, SETTLE_DAYS, SETTLE_WINDOW } from '../settling';
import { supabase } from '../supabaseStore';
import { targetFor } from '../town';
import { PILLARS, type AppData, type Habit, type Pillar } from '../types';
import type { Actions } from '../useData';
import { cleanSizes, SizeFields, type Sizes } from './SizeFields';

interface Props {
  data: AppData;
  actions: Actions;
  storeKind: 'local' | 'supabase';
  account?: string;
}

export function Habits({ data, actions, storeKind, account }: Props) {
  const day = today();
  const week = weekStart(day);
  const [name, setName] = useState('');
  const [pillar, setPillar] = useState<Pillar>('vitality');
  const [sizes, setSizes] = useState<Sizes>({});
  const shelf = data.habits.filter((h) => h.archived);
  const room = hasRoom(data);
  const busy = settling(data);
  const canAdd = room && name.trim() !== '' && !!sizes.small?.trim();

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAdd) return;
    actions.addHabit({ name: name.trim(), pillar, ...cleanSizes(sizes) }, data);
    setName('');
    setSizes({});
  };

  return (
    <div className="stack">
      <section className="panel">
        <h2>Weekly targets</h2>
        <p className="muted tiny">How many days a week each pillar needs, at any size. Changes apply from this week on.</p>
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
                  <button onClick={() => actions.setTarget(p, Math.min(7, t + 1))} aria-label={`Raise ${PILLAR_INFO[p].name} target`}>
                    +
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Habits</h2>
          <span className="tiny muted">
            {busy.length} of {MAX_SETTLING} settling
          </span>
        </div>
        {room ? (
          <form className="new-habit" onSubmit={add}>
            <div className="add-habit">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New habit" aria-label="New habit name" />
              <select value={pillar} onChange={(e) => setPillar(e.target.value as Pillar)} aria-label="Pillar">
                {PILLARS.map((p) => (
                  <option key={p} value={p}>
                    {PILLAR_INFO[p].name}
                  </option>
                ))}
              </select>
            </div>
            {name.trim() && <SizeFields idPrefix="new" value={sizes} onChange={setSizes} />}
            <button className="btn primary" type="submit" disabled={!canAdd}>
              {name.trim() && !sizes.small?.trim() ? 'Add a Small version' : 'Add habit'}
            </button>
          </form>
        ) : (
          <div className="room-note">
            <b>{MAX_SETTLING} habits are settling</b>
            <p className="tiny muted">
              A new habit can join once one of these settles: done on {SETTLE_DAYS} of {SETTLE_WINDOW} days, at any size. If one isn't working, move it
              to Someday to make room.
            </p>
          </div>
        )}
        {PILLARS.map((p) => {
          const list = data.habits.filter((h) => h.pillar === p && !h.archived);
          if (list.length === 0) return null;
          return (
            <div key={p} className="habit-edit-group">
              <h3 style={{ color: PILLAR_INFO[p].color }}>{PILLAR_INFO[p].name}</h3>
              {list.map((h) => (
                <HabitEditor key={h.id} habit={h} data={data} day={day} onSave={actions.saveHabit} />
              ))}
            </div>
          );
        })}
        {shelf.length > 0 && (
          <details className="archived">
            <summary>Someday ({shelf.length})</summary>
            <p className="tiny muted">Habits saved for later, with their history. Bring one back when there's room.</p>
            {shelf.map((h) => {
              const fits = room || isSettled(h, data);
              return (
                <div key={h.id} className="habit-edit">
                  <span>
                    {h.name} <span className="tiny muted">· {PILLAR_INFO[h.pillar].name}</span>
                  </span>
                  <button className="btn" disabled={!fits} onClick={() => actions.saveHabit({ ...h, archived: false })}>
                    {fits ? 'Bring back' : 'No room yet'}
                  </button>
                </div>
              );
            })}
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

function HabitEditor({ habit, data, day, onSave }: { habit: Habit; data: AppData; day: string; onSave: (h: Habit) => void }) {
  const [name, setName] = useState(habit.name);
  const [sizes, setSizes] = useState<Sizes>({ small: habit.small, usual: habit.usual, big: habit.big });
  const [open, setOpen] = useState(false);
  const settled = isSettled(habit, data);
  const recent = recentDays(habit, data, day);
  const commit = () => {
    const trimmed = name.trim() || habit.name;
    setName(trimmed);
    const clean = cleanSizes(sizes);
    // Small can be changed but not removed.
    if (!clean.small && habit.small) clean.small = habit.small;
    const next = { ...habit, name: trimmed, ...clean };
    if (JSON.stringify(next) !== JSON.stringify(habit)) onSave(next);
  };
  return (
    <div className="habit-card">
      <div className="habit-edit">
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} aria-label={`Rename ${habit.name}`} />
        <button className="btn" onClick={() => setOpen(!open)} aria-expanded={open}>
          Sizes
        </button>
      </div>
      <div className="settle-line">
        {settled ? (
          <span className="badge settled">Settled</span>
        ) : (
          <>
            <span className="badge settling">Settling</span>
            <span className="settle-dots" aria-label={`${recent} of the last ${SETTLE_WINDOW} days`}>
              {Array.from({ length: SETTLE_DAYS }, (_, i) => (
                <span key={i} className={i < recent ? 'on' : ''} />
              ))}
            </span>
            <span className="tiny muted">
              {Math.min(recent, SETTLE_DAYS)}/{SETTLE_DAYS} days
            </span>
          </>
        )}
      </div>
      {open && (
        <>
          <SizeFields idPrefix={habit.id} value={sizes} onChange={setSizes} onBlur={commit} />
          <button className="btn ghost" onClick={() => onSave({ ...habit, archived: true })}>
            Move to Someday
          </button>
        </>
      )}
    </div>
  );
}
