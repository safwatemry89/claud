import { useCallback, useEffect, useState } from 'react';
import { api, getApiUrl, getToken, setApiUrl, setToken, type Dashboard, type GlucoseLog } from './api';
import { DkaOverlay, Zone1 } from './components/Zone1';
import { GlucoseRing, QuickActions, StatsRow, TrendChart } from './components/Zone2';
import { FoodLog, HydrationGrid, Medications, Rituals } from './components/Zone3';
import { isNative, requestNotificationPermission } from './storage';

const MIN_PASSWORD_LENGTH = 10;

/** Emailed links open the app with ?verify=… or ?reset=…; read them once and clean the address bar. */
const linkParams = (() => {
  const q = new URLSearchParams(window.location.search);
  const verify = q.get('verify');
  const reset = q.get('reset');
  if (verify || reset) window.history.replaceState(null, '', window.location.pathname);
  return { verify, reset };
})();

type LoginMode = 'signin' | 'register' | 'forgot' | 'reset';

function Login({ onDone, notice }: { onDone: () => void; notice: string | null }) {
  const [mode, setMode] = useState<LoginMode>(linkParams.reset ? 'reset' : 'signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServer] = useState(getApiUrl());
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const newPassword = mode === 'register' || mode === 'reset';
  const switchTo = (m: LoginMode) => { setMode(m); setError(null); setInfo(null); };

  const submit = async () => {
    if (mode === 'register') return (await api.register(email, password, name || undefined)).token;
    if (mode === 'signin') return (await api.login(email, password)).token;
    if (mode === 'reset') return (await api.resetPassword(linkParams.reset!, password)).token;
    setInfo((await api.forgotPassword(email)).message);
    return null;
  };

  return (
    <main className="login">
      <h1>Metabolic-90</h1>
      <p className="muted">Absolute Glycemic Mastery & Digestive Recovery Engine</p>
      {notice && <p className="notice">{notice}</p>}
      {mode === 'reset' && <h2>Choose a new password</h2>}
      {mode === 'forgot' && <p>Enter your email and we'll send you a link to reset your password.</p>}
      <form onSubmit={async (e) => {
        e.preventDefault();
        if (isNative && !/^https?:\/\//.test(server)) return setError('Enter the server URL, e.g. https://api.example.com');
        setApiUrl(server);
        setBusy(true); setError(null);
        try {
          const token = await submit();
          if (token) { setToken(token); onDone(); }
        } catch (x) {
          setError((x as Error).message);
        } finally {
          setBusy(false);
        }
      }}>
        {(isNative || server) && (
          <input type="url" placeholder="Server URL (https://…)" value={server} onChange={(e) => setServer(e.target.value)} />
        )}
        {mode === 'register' && (
          <input type="text" autoComplete="name" placeholder="Name (optional)" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        )}
        {mode !== 'reset' && (
          <input type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        )}
        {mode !== 'forgot' && (
          <input
            type="password" required placeholder={newPassword ? `Password (at least ${MIN_PASSWORD_LENGTH} characters)` : 'Password'}
            autoComplete={newPassword ? 'new-password' : 'current-password'}
            minLength={newPassword ? MIN_PASSWORD_LENGTH : undefined} maxLength={200}
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
        )}
        <button className="btn primary" disabled={busy}>
          {{ signin: 'Sign in', register: 'Create account', forgot: 'Send reset link', reset: 'Save new password' }[mode]}
        </button>
        {error && <p className="error">{error}</p>}
        {info && <p className="notice">{info}</p>}
      </form>
      {mode === 'signin' && <button className="link" type="button" onClick={() => switchTo('forgot')}>Forgot your password?</button>}
      <button className="link" type="button" onClick={() => switchTo(mode === 'signin' ? 'register' : 'signin')}>
        {mode === 'signin' ? 'New here? Create an account' : 'Back to sign in'}
      </button>
    </main>
  );
}

function VerifyBanner() {
  const [state, setState] = useState<'hidden' | 'unverified' | 'sent'>('hidden');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api.me().then((u) => setState(u.emailVerifiedAt ? 'hidden' : 'unverified')).catch(() => {}); }, []);
  if (state === 'hidden') return null;
  return (
    <p className="notice verify-banner">
      {state === 'sent' ? 'Check your inbox for the confirmation link.' : 'Please confirm your email address.'}{' '}
      {state === 'unverified' && (
        <button className="link" onClick={() => api.resendVerification().then(() => setState('sent')).catch((e) => setError((e as Error).message))}>
          Resend email
        </button>
      )}
      {error && <span className="error"> {error}</span>}
    </p>
  );
}

export function App() {
  const [authed, setAuthed] = useState(Boolean(getToken()));
  const [data, setData] = useState<Dashboard | null>(null);
  const [logs, setLogs] = useState<GlucoseLog[]>([]);
  const [missedMsg, setMissedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!linkParams.verify) return;
    api.verifyEmail(linkParams.verify)
      .then(() => setNotice('Your email is confirmed.'))
      .catch((e) => setNotice((e as Error).message));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [d, l] = await Promise.all([api.dashboard(), api.glucose(14)]);
      setData(d); setLogs(l); setError(null);
    } catch (e) {
      if (!getToken()) setAuthed(false);
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => { if (authed) { requestNotificationPermission(); void refresh(); } }, [authed, refresh]);
  useEffect(() => { const id = setInterval(refresh, 60_000); return () => clearInterval(id); }, [refresh]);

  if (!authed) return <Login notice={notice} onDone={() => { setNotice(null); setAuthed(true); }} />;
  if (!data) return <main className="loading">{error ?? 'Loading…'}</main>;

  const dka = data.alert === 'DKA';
  return (
    <>
      {dka && <DkaOverlay onLogged={refresh} />}
      <main className="app" aria-hidden={dka} {...(dka ? { inert: '' } : {})}>
        <header className="top">
          <strong>Metabolic-90</strong>
          <span className="muted">Day {data.program.currentDayNumber}/90 · Week {data.program.currentWeekCycle}</span>
          <button className="link" onClick={() => { setToken(null); setAuthed(false); }}>Sign out</button>
        </header>
        {notice && <p className="notice">{notice}</p>}
        <VerifyBanner key={notice ?? ''} />

        {/* ZONE 1 */}
        <Zone1 data={data} />

        {/* ZONE 2 */}
        <section className="zone2">
          <GlucoseRing latest={data.latest} />
          <QuickActions onLogged={(msg) => { setMissedMsg(msg ?? null); void refresh(); }} />
          <StatsRow a={data.analytics} />
          <TrendChart logs={logs} />
        </section>

        {/* ZONE 3 */}
        <section className="zone3">
          <FoodLog isFriday={data.program.isCarbCycleDay} />
          <HydrationGrid initial={data.hydration} />
          <Medications alertMissed={missedMsg} />
          <Rituals />
        </section>

        <footer className="muted disclaimer">
          Metabolic-90 is a self-tracking aid, not a medical device. Follow your clinician's advice for any treatment decisions.
        </footer>
      </main>
    </>
  );
}
