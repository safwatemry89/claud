import { useState } from 'react';
import {
  CONTEXT_LABELS, MAX_VALID_MG_DL, MIN_VALID_MG_DL, SAFETY_CEILING_MG_DL, ZONE_COLORS, formatElapsed,
  type GlucoseContext,
} from '@m90/core';
import { api, type Dashboard, type GlucoseLog, type SymptomInput } from '../api';

export function GlucoseRing({ latest }: { latest: Dashboard['latest'] }) {
  const r = 80;
  const c = 2 * Math.PI * r;
  const color = latest ? ZONE_COLORS[latest.status] : '#94a3b8';
  const frac = latest ? Math.min(1, latest.valueMgPerDl / 300) : 0;
  return (
    <div className="ring">
      <svg viewBox="0 0 200 200" role="img" aria-label={latest ? `${latest.valueMgPerDl} mg/dL, ${latest.status}` : 'No readings'}>
        <circle cx="100" cy="100" r={r} fill="none" stroke="var(--track)" strokeWidth="14" />
        <circle cx="100" cy="100" r={r} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={`${c * frac} ${c}`} transform="rotate(-90 100 100)" />
        <text x="100" y="98" textAnchor="middle" className="ring-value" fill="currentColor">{latest?.valueMgPerDl ?? '—'}</text>
        <text x="100" y="124" textAnchor="middle" className="ring-unit" fill="currentColor">mg/dL</text>
      </svg>
      <p className="ring-sub">
        {latest ? `Measured ${formatElapsed(new Date(latest.measuredAt))} - ${CONTEXT_LABELS[latest.context]}` : 'Log your first reading'}
      </p>
    </div>
  );
}

const SYMPTOMS: { key: keyof SymptomInput; label: string; emergency?: boolean }[] = [
  { key: 'continuousBurping', label: 'Continuous Burping' },
  { key: 'bloating', label: 'Bloating' },
  { key: 'nausea', label: 'Nausea / Vomiting', emergency: true },
  { key: 'abdominalPain', label: 'Abdominal Pain', emergency: true },
  { key: 'extremeLethargy', label: 'Lethargy / Confusion', emergency: true },
  { key: 'shortnessOfBreath', label: 'Rapid Shortness of Breath', emergency: true },
];

function SymptomChecks({ value, onChange }: { value: SymptomInput; onChange: (v: SymptomInput) => void }) {
  return (
    <fieldset className="checks">
      {SYMPTOMS.map((s) => (
        <label key={s.key}>
          <input type="checkbox" checked={Boolean(value[s.key])} onChange={(e) => onChange({ ...value, [s.key]: e.target.checked })} />
          {s.label}{s.emergency && <span className="flag" title="Emergency flag">!</span>}
        </label>
      ))}
    </fieldset>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function QuickActions({ onLogged }: { onLogged: (msg?: string) => void }) {
  const [open, setOpen] = useState<'glucose' | 'symptoms' | null>(null);
  const [value, setValue] = useState('');
  const [context, setContext] = useState<GlucoseContext>('AFTER_MEAL');
  const [symptoms, setSymptoms] = useState<SymptomInput>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => { setOpen(null); setError(null); setValue(''); setSymptoms({}); };

  async function submitGlucose(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(value);
    if (!Number.isInteger(n) || n < MIN_VALID_MG_DL || n > MAX_VALID_MG_DL) {
      return setError(`Enter a whole number between ${MIN_VALID_MG_DL} and ${MAX_VALID_MG_DL}.`);
    }
    setBusy(true);
    try {
      const hasSymptoms = Object.values(symptoms).some(Boolean);
      const res = await api.logGlucose({ valueMgPerDl: n, context, symptoms: hasSymptoms ? symptoms : undefined });
      const missed = res.missedDoses.map((d) => d.medName).join(', ');
      close();
      onLogged(missed ? `Missed dose window detected before this spike: ${missed}` : undefined);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitSymptoms(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.logSymptoms(symptoms);
      close();
      onLogged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="actions">
        <button className="btn primary" onClick={() => setOpen('glucose')}>+ Log Glucose</button>
        <button className="btn" onClick={() => setOpen('symptoms')}>+ Log Symptoms</button>
      </div>
      {open === 'glucose' && (
        <Modal title="Log Glucose" onClose={close}>
          <form onSubmit={submitGlucose}>
            <label>Value (mg/dL)
              <input autoFocus inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))} />
            </label>
            <label>Context
              <select value={context} onChange={(e) => setContext(e.target.value as GlucoseContext)}>
                {(Object.keys(CONTEXT_LABELS) as GlucoseContext[]).map((c) => <option key={c} value={c}>{CONTEXT_LABELS[c]}</option>)}
              </select>
            </label>
            <p className="muted">Any current symptoms?</p>
            <SymptomChecks value={symptoms} onChange={setSymptoms} />
            {error && <p className="error">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="btn" onClick={close}>Cancel</button>
              <button className="btn primary" disabled={busy}>Save</button>
            </div>
          </form>
        </Modal>
      )}
      {open === 'symptoms' && (
        <Modal title="Log Symptoms" onClose={close}>
          <form onSubmit={submitSymptoms}>
            <SymptomChecks value={symptoms} onChange={setSymptoms} />
            <label>Severity (1–10)
              <input type="range" min={1} max={10} value={symptoms.severityScore ?? 1}
                onChange={(e) => setSymptoms({ ...symptoms, severityScore: Number(e.target.value) })} />
            </label>
            {error && <p className="error">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="btn" onClick={close}>Cancel</button>
              <button className="btn primary" disabled={busy}>Save</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

/** Custom SVG trendline with the 180 mg/dL dotted safety ceiling. */
export function TrendChart({ logs }: { logs: GlucoseLog[] }) {
  const W = 600, H = 220, P = { l: 40, r: 12, t: 12, b: 24 };
  if (logs.length === 0) return <div className="card muted">No readings in the last 14 days.</div>;
  const ts = logs.map((l) => new Date(l.measuredAt).getTime());
  const t0 = Math.min(...ts), t1 = Math.max(...ts);
  const yMax = Math.max(260, ...logs.map((l) => l.valueMgPerDl + 20));
  const yMin = Math.min(60, ...logs.map((l) => l.valueMgPerDl - 20));
  const x = (t: number) => P.l + (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - (v - yMin) / (yMax - yMin)) * (H - P.t - P.b);
  const path = logs.map((l, i) => `${i ? 'L' : 'M'}${x(ts[i]!).toFixed(1)},${y(l.valueMgPerDl).toFixed(1)}`).join(' ');
  const ticks = [100, 140, 200, 250].filter((v) => v > yMin && v < yMax);
  return (
    <div className="card">
      <h3>Glycemic Velocity Trendline</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Glucose trend over 14 days">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="var(--grid)" />
            <text x={P.l - 6} y={y(v) + 4} textAnchor="end" className="axis">{v}</text>
          </g>
        ))}
        <line x1={P.l} x2={W - P.r} y1={y(SAFETY_CEILING_MG_DL)} y2={y(SAFETY_CEILING_MG_DL)}
          stroke={ZONE_COLORS.HIGH} strokeWidth="2" strokeDasharray="6 5" />
        <text x={W - P.r} y={y(SAFETY_CEILING_MG_DL) - 6} textAnchor="end" className="axis ceiling">180 safety ceiling</text>
        <path d={path} fill="none" stroke="var(--line)" strokeWidth="2" />
        {logs.map((l, i) => (
          <circle key={l.id} cx={x(ts[i]!)} cy={y(l.valueMgPerDl)} r="4" fill={ZONE_COLORS[l.status]}>
            <title>{`${l.valueMgPerDl} mg/dL · ${new Date(l.measuredAt).toLocaleString()}`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

export function StatsRow({ a }: { a: Dashboard['analytics'] }) {
  const stat = (label: string, v: number | null, unit = '') => (
    <div className="stat"><span>{label}</span><strong>{v == null ? '—' : `${v}${unit}`}</strong></div>
  );
  return (
    <div className="stats">
      {stat('14-day mean', a.meanMgPerDl, ' mg/dL')}
      {stat('eA1c', a.eA1cPercent, '%')}
      {stat('Day-90 projection', a.projection.projectedDay90EA1c, '%')}
      {stat('Time in range', a.timeInRangePercent, '%')}
      {stat('Velocity', a.velocityMgPerDlPerHour, ' /hr')}
    </div>
  );
}
