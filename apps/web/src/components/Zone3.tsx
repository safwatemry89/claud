import { useEffect, useState } from 'react';
import {
  DAILY_CUPS, FRIDAY_STEPS, ZERO_CARB_MENU, isStepUnlocked, ritualStatuses, EMPTY_SEQUENCE,
  type FridayStepKey, type GlycemicSequence, type HydrationStatus, type RitualView,
} from '@m90/core';
import { api, type MedicationDose } from '../api';
import { load, notify, save, todayKey } from '../storage';

export function FoodLog({ isFriday }: { isFriday: boolean }) {
  const [seq, setSeq] = useState<GlycemicSequence>(EMPTY_SEQUENCE);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { api.mealToday().then((r) => r.meal && setSeq(r.meal)).catch(() => {}); }, []);

  async function toggle(step: FridayStepKey, checked: boolean) {
    setError(null);
    try {
      const r = await api.toggleMeal(step, checked);
      setSeq(r.meal);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!isFriday) {
    return (
      <div className="card">
        <h3>Glycemic Sequence · Zero-Carb Day</h3>
        <p className="muted">Saturday–Thursday: pure proteins, full-fat dairy and non-starchy greens. No carbohydrates.</p>
        <div className="menu">
          <div><h4>Proteins</h4>{ZERO_CARB_MENU.proteins.join(' · ')}</div>
          <div><h4>Full-fat dairy</h4>{ZERO_CARB_MENU.dairy.join(' · ')}</div>
          <div><h4>Green vegetables</h4>{ZERO_CARB_MENU.vegetables.join(' · ')}</div>
          <div className="forbidden"><h4>Not permitted</h4>{ZERO_CARB_MENU.forbidden.join(' · ')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>Glycemic Sequence · Friday Carb-Cycling</h3>
      <p className="muted">Check off each step in order. Carbs unlock only after fiber and protein.</p>
      {FRIDAY_STEPS.map((s) => {
        const locked = !isStepUnlocked(seq, s.key);
        return (
          <label key={s.key} className={`seq-step ${locked ? 'locked' : ''} ${seq[s.key] ? 'done' : ''}`}>
            <input type="checkbox" disabled={locked} checked={seq[s.key]} onChange={(e) => toggle(s.key, e.target.checked)} />
            <span>{locked ? '🔒 ' : ''}{s.label}</span>
          </label>
        );
      })}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export function HydrationGrid({ initial }: { initial: HydrationStatus }) {
  const [h, setH] = useState(initial);
  useEffect(() => setH(initial), [initial]);

  useEffect(() => {
    const key = `m90.hydration.notified.${todayKey()}.${new Date().getHours()}`;
    if (h.behindSchedule && !load(key, false)) {
      save(key, true);
      notify('Hydration behind schedule', `You are ${h.deficitMl} ml behind your 2 L target pace.`);
    }
  }, [h]);

  async function tap(i: number) {
    try { setH(i < h.cupsFilled ? await api.removeCup() : await api.addCup()); } catch { /* ignore */ }
  }

  return (
    <div className="card">
      <h3>Smart Hydration Ledger</h3>
      <div className="dots">
        {Array.from({ length: DAILY_CUPS }, (_, i) => (
          <button key={i} className={`dot ${i < h.cupsFilled ? 'filled' : ''}`} onClick={() => tap(i)}
            aria-label={`Cup ${i + 1} of ${DAILY_CUPS}, ${i < h.cupsFilled ? 'filled' : 'empty'}`} aria-pressed={i < h.cupsFilled} />
        ))}
      </div>
      <p className={h.behindSchedule ? 'warn' : 'muted'}>
        {h.consumedMl} / {h.targetMl} ml{h.behindSchedule ? ` · ${h.deficitMl} ml behind schedule` : ' · on track'}
      </p>
    </div>
  );
}

export function Medications({ alertMissed }: { alertMissed: string | null }) {
  const [doses, setDoses] = useState<MedicationDose[]>([]);
  const [adherence, setAdherence] = useState<number | null>(null);
  const [form, setForm] = useState({ medName: '', doseTaken: '', time: '08:00' });

  const refresh = () => api.medsToday().then((r) => { setDoses(r.doses); setAdherence(r.adherencePercent); }).catch(() => {});
  useEffect(() => { void refresh(); }, []);

  async function add(e: React.FormEvent, isMissed = false) {
    e.preventDefault();
    if (!form.medName || !form.doseTaken) return;
    const [hh, mm] = form.time.split(':').map(Number);
    const scheduled = new Date(); scheduled.setHours(hh ?? 8, mm ?? 0, 0, 0);
    await api.addMed({ medName: form.medName, doseTaken: form.doseTaken, scheduledTime: scheduled.toISOString(), isMissed });
    setForm({ ...form, medName: '', doseTaken: '' });
    void refresh();
  }

  return (
    <div className="card">
      <h3>Medication & Supplement Sync {adherence != null && <span className="pill">{adherence}% adherence</span>}</h3>
      {alertMissed && <p className="error">⚠️ {alertMissed}</p>}
      <table className="meds">
        <tbody>
          {doses.map((d) => (
            <tr key={d.id} className={d.isMissed ? 'missed' : ''}>
              <td>{new Date(d.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
              <td>{d.medName}</td><td>{d.doseTaken}</td>
              <td><button className="link" onClick={() => api.markMed(d.id, !d.isMissed).then(refresh)}>{d.isMissed ? 'Missed' : 'Taken'}</button></td>
            </tr>
          ))}
          {doses.length === 0 && <tr><td className="muted">No doses logged today.</td></tr>}
        </tbody>
      </table>
      <form className="med-form" onSubmit={(e) => add(e)}>
        <input placeholder="Medication" value={form.medName} onChange={(e) => setForm({ ...form, medName: e.target.value })} />
        <input placeholder="Dose" value={form.doseTaken} onChange={(e) => setForm({ ...form, doseTaken: e.target.value })} />
        <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
        <button className="btn">Taken</button>
        <button type="button" className="btn" onClick={(e) => add(e, true)}>Missed</button>
      </form>
    </div>
  );
}

const STATUS_LABEL: Record<RitualView['status'], string> = {
  CHECKED: 'Checked', MISSED: 'Missed', ACTIVE: 'Active', PENDING: 'Pending', UPCOMING: 'Upcoming',
};

export function Rituals() {
  const key = `m90.rituals.${todayKey()}`;
  const [done, setDone] = useState(() => load(key, { okra: null as string | null, cinnamon: false, greenTea: false }));
  const [meals, setMeals] = useState(() => load(`${key}.meals`, { next: '13:00', last: '' }));
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(id); }, []);

  const at = (hhmm: string) => { if (!hhmm) return null; const [h, m] = hhmm.split(':').map(Number); const d = new Date(now); d.setHours(h ?? 0, m ?? 0, 0, 0); return d; };
  const views = ritualStatuses({
    now, okraTakenAt: done.okra ? new Date(done.okra) : null, nextMealAt: at(meals.next), lastMealAt: at(meals.last),
    cinnamonDone: done.cinnamon, greenTeaDone: done.greenTea,
  });
  const update = (n: typeof done) => { setDone(n); save(key, n); };
  const toggle = (k: RitualView['key']) =>
    update(k === 'okra' ? { ...done, okra: done.okra ? null : new Date().toISOString() } : { ...done, [k]: !done[k] });

  return (
    <div className="card">
      <h3>Ritual Synchronization Log</h3>
      <div className="meal-times">
        <label>Next meal <input type="time" value={meals.next} onChange={(e) => { const m = { ...meals, next: e.target.value }; setMeals(m); save(`${key}.meals`, m); }} /></label>
        <label>Last meal <input type="time" value={meals.last} onChange={(e) => { const m = { ...meals, last: e.target.value }; setMeals(m); save(`${key}.meals`, m); }} /></label>
      </div>
      <ul className="rituals">
        {views.map((v) => (
          <li key={v.key}>
            <button className="link" onClick={() => toggle(v.key)}>[{v.icon} {v.when}] {v.title}</button>
            <span className={`status s-${v.status.toLowerCase()}`}>{STATUS_LABEL[v.status]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
