import { FormEvent, useEffect, useState } from 'react';
import { LogIn, LogOut, UserRound, UserPlus, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

type AccountUser = { id: string; username: string };

function usernameEmail(username: string) {
  // Supabase Auth currently authenticates with email/password. A reserved,
  // app-owned synthetic address lets players use usernames without supplying
  // a real email address. Email confirmation must be disabled for this flow.
  return `${username.toLowerCase()}@accounts.chess4fun.app`;
}

export function AccountPanel() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<AccountUser | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const current = data.session?.user;
      if (current) setUser({
        id: current.id,
        username: String(current.user_metadata?.username || current.email?.split('@')[0] || 'Player'),
      });
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const current = session?.user;
      setUser(current ? {
        id: current.id,
        username: String(current.user_metadata?.username || current.email?.split('@')[0] || 'Player'),
      } : null);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setError('Username must be 3–20 characters using letters, numbers, or underscores.');
      setBusy(false);
      return;
    }
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      setBusy(false);
      return;
    }
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: usernameEmail(cleanUsername),
          password,
          options: { data: { username: cleanUsername, display_name: username.trim() } },
        });
        if (authError) throw authError;
        if (data.session && data.user) {
          setUser({ id: data.user.id, username: cleanUsername });
          localStorage.setItem('chessPlayerName', username.trim());
          setMessage('Account created. You’re all set — enjoy your game.');
          setPassword('');
        } else {
          setMessage('Supabase created the account but did not sign you in. This app uses username-only accounts, so email confirmation must be OFF in Supabase Dashboard → Authentication → Providers → Email. Then try signing up again.');
        }
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: usernameEmail(cleanUsername),
          password,
        });
        if (authError) throw authError;
        if (data.user) {
          setUser({ id: data.user.id, username: cleanUsername });
          localStorage.setItem('chessPlayerName', username.trim());
          setMessage('Welcome back. Good to see you at the board.');
          setPassword('');
        }
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Could not complete sign in.';
      const lower = text.toLowerCase();
      if (lower.includes('fetch') || lower.includes('failed to fetch')) {
        setError('Could not reach Supabase. Check that Vercel has the correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY), then redeploy.');
      } else if (lower.includes('email not confirmed')) {
        setError('This account is waiting for email confirmation. Username-only accounts require Email confirmation to be disabled in Supabase Dashboard → Authentication → Providers → Email.');
      } else if (lower.includes('user already registered')) {
        setError('That username is already registered. Switch to Sign in, or choose a different username.');
      } else {
        setError(text);
      }
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    const { error: authError } = await supabase.auth.signOut();
    if (authError) setError(authError.message);
    else { setUser(null); setMessage('You’ve signed out.'); }
    setBusy(false);
  };

  if (user) {
    return (
      <section className="account-card">
        <div className="account-avatar"><UserRound size={20} /></div>
        <div className="account-copy">
          <span className="account-eyebrow">SIGNED IN AS</span>
          <strong>{user.username}</strong>
          <span className="account-subtitle">Your account is ready to play</span>
        </div>
        <button className="icon-button" onClick={signOut} disabled={busy} aria-label="Sign out" title="Sign out">
          <LogOut size={18} />
        </button>
        {message && <p className="account-message">{message}</p>}
        {error && <p className="account-error">{error}</p>}
      </section>
    );
  }

  return (
    <section className="account-card">
      <div className="account-heading">
        <div className="account-avatar"><ShieldCheck size={20} /></div>
        <div className="account-copy">
          <span className="account-eyebrow">YOUR CHESS ID</span>
          <strong>Keep your name. Keep your progress.</strong>
          <span className="account-subtitle">No real email address needed</span>
        </div>
      </div>
      <div className="account-tabs" role="tablist" aria-label="Account options">
        <button type="button" className={mode === 'signin' ? 'account-tab active' : 'account-tab'} onClick={() => { setMode('signin'); setError(''); setMessage(''); }}>
          <LogIn size={15} /> Sign in
        </button>
        <button type="button" className={mode === 'signup' ? 'account-tab active' : 'account-tab'} onClick={() => { setMode('signup'); setError(''); setMessage(''); }}>
          <UserPlus size={15} /> Create account
        </button>
      </div>
      <form onSubmit={submit} className="account-form">
        <label>
          <span>Username</span>
          <input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. quietknight" maxLength={20} required />
        </label>
        <label>
          <span>Password</span>
          <input autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} required />
        </label>
        {mode === 'signup' && <p className="account-hint">Use 3–20 letters, numbers, or underscores for your username. Keep your password private.</p>}
        {error && <p className="account-error">{error}</p>}
        {message && <p className="account-message">{message}</p>}
        <button className="account-submit" type="submit" disabled={busy}>
          {busy ? 'One moment…' : mode === 'signup' ? 'Create my account' : 'Let me in'}
        </button>
      </form>
    </section>
  );
}
