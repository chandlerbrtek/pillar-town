import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { LocalStore, type Store } from './store';
import { SupabaseStore, supabase } from './supabaseStore';
import { useData } from './useData';
import { Onboarding } from './screens/Onboarding';
import { Today } from './screens/Today';
import { TownView } from './screens/TownView';
import { Habits } from './screens/Habits';
import { Login } from './screens/Login';
import { ToastProvider } from './Toast';
import { isMuted, setMuted, sfx } from './sound';
import { deriveTown } from './town';
import { today } from './dates';
import { SeedCount } from './screens/SeedCount';
import type { AppData } from './types';

const localStore = new LocalStore();

export default function App() {
  return <ToastProvider>{supabase ? <AuthGate /> : <Game store={localStore} />}</ToastProvider>;
}

function AuthGate() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase!.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase!.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  const store = useMemo(() => (userId ? new SupabaseStore(supabase!, userId) : null), [userId]);

  if (session === undefined) return <Loading />;
  if (!session || !store) return <Login />;
  return <Game store={store} account={session.user.email ?? 'your account'} />;
}

type Tab = 'today' | 'town' | 'habits';

function Game({ store, account }: { store: Store; account?: string }) {
  const { data, error, clearError, actions } = useData(store);
  const [tab, setTab] = useState<Tab>('today');

  if (!data) return error ? <ErrorBanner message={error} onClose={clearError} /> : <Loading />;

  return (
    <div className="app">
      <header className="topbar">
        <h1>PillarTown</h1>
        <div className="topbar-right">
          {data.startedOn && <Wallet data={data} />}
          <SoundToggle />
        </div>
      </header>
      {error && <ErrorBanner message={error} onClose={clearError} />}
      <main className="content">
        {!data.startedOn ? (
          <Onboarding onStart={actions.start} />
        ) : tab === 'today' ? (
          <Today data={data} actions={actions} />
        ) : tab === 'town' ? (
          <TownView data={data} actions={actions} />
        ) : (
          <Habits data={data} actions={actions} storeKind={store.kind} account={account} />
        )}
      </main>
      {data.startedOn && (
        <nav className="tabs">
          {(['today', 'town', 'habits'] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? 'tab active' : 'tab'} onClick={() => {
                setTab(t);
                window.scrollTo(0, 0);
              }}>
              {t === 'today' ? 'Today' : t === 'town' ? 'Town' : 'Habits'}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

function Wallet({ data }: { data: AppData }) {
  const balance = useMemo(() => deriveTown(data, today()).seeds.balance, [data]);
  return (
    <span className="wallet">
      <SeedCount value={balance} plain />
    </span>
  );
}

function SoundToggle() {
  const [muted, setMutedState] = useState(isMuted);
  const toggle = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) sfx.enabled();
  };
  return (
    <button className="sound-toggle" onClick={toggle} aria-pressed={!muted} aria-label={muted ? 'Turn sound on' : 'Turn sound off'}>
      {muted ? 'Sound: off' : 'Sound: on'}
    </button>
  );
}

function Loading() {
  return <div className="center-screen">Loading…</div>;
}

function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="error-banner" role="alert">
      <span>{message}</span>
      <button onClick={onClose} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
