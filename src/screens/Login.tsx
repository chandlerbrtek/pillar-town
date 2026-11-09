import { useState } from 'react';
import { IsoIcon } from '../iso/IsoIcon';
import { supabase } from '../supabaseStore';

/** Email and password sign-in, used only when Supabase is configured. */
export function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    if (mode === 'signin') {
      const { error } = await supabase!.auth.signInWithPassword({ email, password });
      if (error) setMessage({ text: error.message, error: true });
    } else {
      const { data, error } = await supabase!.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + window.location.pathname },
      });
      if (error) setMessage({ text: error.message, error: true });
      else if (!data.session) {
        // The project requires email confirmation before the first sign-in.
        setMessage({ text: 'Account created. Confirm it from the email we sent, then sign in.', error: false });
        setMode('signin');
      }
    }
    setBusy(false);
  };

  return (
    <div className="app">
      <main className="content center-screen">
        <section className="panel login">
          <div className="login-art">
            <IsoIcon item={{ kind: 'bond', level: 3 }} size={56} />
            <IsoIcon item={{ kind: 'vitality', level: 3 }} size={56} />
            <IsoIcon item={{ kind: 'mind', level: 3 }} size={56} />
          </div>
          <h1>PillarTown</h1>
          <form onSubmit={submit} className="stack">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              aria-label="Email"
            />
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              aria-label="Password"
            />
            <button className="btn primary" disabled={busy}>
              {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
            {message && <p className={message.error ? 'error-text' : 'muted'}>{message.text}</p>}
          </form>
          <button
            className="link-btn"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setMessage(null);
            }}
          >
            {mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
          </button>
        </section>
      </main>
    </div>
  );
}
