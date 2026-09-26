import { useEffect, useRef, useState } from 'react';
import { DKA_ALERT_TEXT, RECALIBRATION_PUSH_TEXT, RESCUE_STEPS, formatCountdown, secondsRemaining, type RescueStepKey } from '@m90/core';
import { api, type Dashboard } from '../api';
import { load, notify, save } from '../storage';

export function DkaOverlay({ onLogged }: { onLogged: () => void }) {
  const [value, setValue] = useState('');
  const [err, setErr] = useState<string | null>(null);
  // Non-dismissible: no close control, traps focus, blocks scroll + navigation beneath.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const trap = (e: KeyboardEvent) => { if (e.key === 'Escape') e.preventDefault();
      if (e.key === 'Tab' && !ref.current?.contains(document.activeElement)) { e.preventDefault(); ref.current?.focus(); } };
    document.addEventListener('keydown', trap, true);
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', trap, true); };
  }, []);
  return (
    <div className="dka" role="alertdialog" aria-modal="true" aria-labelledby="dka-text" tabIndex={-1} ref={ref}>
      <div className="dka-inner">
        <p id="dka-text">{DKA_ALERT_TEXT}</p>
        <a className="dka-call" href="tel:911">Call Emergency Services</a>
        <form className="dka-recheck" onSubmit={async (e) => {
          e.preventDefault();
          try { await api.logGlucose({ valueMgPerDl: Number(value), context: 'RANDOM' }); setValue(''); onLogged(); }
          catch (x) { setErr((x as Error).message); }
        }}>
          <label>Under medical supervision? Log a new reading to re-evaluate:
            <input inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))} />
          </label>
          <button className="btn">Re-evaluate</button>
          {err && <p className="error">{err}</p>}
        </form>
      </div>
    </div>
  );
}

function RescueBanner({ spikeId, recalibrateAt }: { spikeId: string; recalibrateAt: string }) {
  const key = `m90.rescue.${spikeId}`;
  const [checked, setChecked] = useState<Record<RescueStepKey, boolean>>(() => load(key, { hydration: false, walking: false, posture: false }));
  const deadline = new Date(recalibrateAt);
  const [secs, setSecs] = useState(() => secondsRemaining(deadline));
  const notified = useRef(load(`${key}.notified`, false));

  useEffect(() => {
    const id = setInterval(() => {
      const s = secondsRemaining(deadline);
      setSecs(s);
      if (s === 0 && !notified.current) {
        notified.current = true;
        save(`${key}.notified`, true);
        notify('Recalibration Window', RECALIBRATION_PUSH_TEXT);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [recalibrateAt]);

  const toggle = (k: RescueStepKey) => setChecked((c) => { const n = { ...c, [k]: !c[k] }; save(key, n); return n; });

  return (
    <section className="rescue" aria-live="assertive">
      <h2>⚠️ 200+ Rescue Protocol</h2>
      {RESCUE_STEPS.map((s) => (
        <label key={s.key} className={`rescue-step ${checked[s.key] ? 'done' : ''}`}>
          <input type="checkbox" checked={checked[s.key]} onChange={() => toggle(s.key)} />
          <span>
            <strong>{s.icon} {s.label}</strong>
            <small>{s.subtext}</small>
          </span>
        </label>
      ))}
      <div className={`countdown ${secs === 0 ? 'expired' : ''}`}>
        <span>⏱️ Recalibration Countdown</span>
        <strong>{formatCountdown(secs)}</strong>
        {secs === 0 && <p>{RECALIBRATION_PUSH_TEXT}</p>}
      </div>
    </section>
  );
}

export function Zone1({ data }: { data: Dashboard }) {
  if (data.alert === 'RESCUE' && data.latest && data.recalibrateAt) {
    return <RescueBanner spikeId={data.latest.id} recalibrateAt={data.recalibrateAt} />;
  }
  return <section className="greeting">{data.program.greeting}</section>;
}
