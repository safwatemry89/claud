import { useCallback, useEffect, useState } from 'react';
import { api, getToken, setToken, type Dashboard, type GlucoseLog } from './api';
import { DkaOverlay, Zone1 } from './components/Zone1';
import { GlucoseRing, QuickActions, StatsRow, TrendChart } from './components/Zone2';
import { FoodLog, HydrationGrid, Medications, Rituals } from './components/Zone3';
import { requestNotificationPermission } from './storage';

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <main className="login">
      <h1>Metabolic-90</h1>
      <p className="muted">Absolute Glycemic Mastery & Digestive Recovery Engine</p>
      <form onSubmit={async (e) => {
        e.preventDefault();
        try { setToken((await api.devLogin(email)).token); onDone(); } catch (x) { setError((x as Error).message); }
      }}>
        <input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn primary">Sign in</button>
        {error && <p className="error">{error}</p>}
      </form>
    </main>
  );
}

export function App() {
  const [authed, setAuthed] = useState(Boolean(getToken()));
  const [data, setData] = useState<Dashboard | null>(null);
  const [logs, setLogs] = useState<GlucoseLog[]>([]);
  const [missedMsg, setMissedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (!authed) return <Login onDone={() => setAuthed(true)} />;
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
