import { DKA_ABSOLUTE_THRESHOLD_MG_DL, RESCUE_THRESHOLD_MG_DL } from './glucose';

/** Emergency flags that, combined with a reading >= 200 mg/dL, escalate to the DKA overlay. */
export interface EmergencyFlags {
  nausea?: boolean; // Nausea/Vomiting
  abdominalPain?: boolean; // Severe Abdominal Pain
  shortnessOfBreath?: boolean; // Rapid Shortness of Breath
  extremeLethargy?: boolean; // Extreme Lethargy/Confusion
}

export type AlertLevel = 'NONE' | 'RESCUE' | 'DKA';

export const DKA_ALERT_TEXT =
  '🚨 CRITICAL MEDICAL ALERT: SUSPECTED DIABETIC KETOACIDOSIS (DKA). Your current blood glucose levels combined with your metabolic symptoms indicate an acute, life-threatening crisis due to severe insulin deficiency. DO NOT attempt to self-treat with diet, water, or walking. Immediately call emergency services or proceed directly to the nearest hospital Emergency Room.';

export const RECALIBRATION_MINUTES = 60;
export const RECALIBRATION_PUSH_TEXT =
  'Recalibration Window: Please re-measure your blood glucose now to verify it has dropped below the 180 mg/dL safety ceiling.';

export function hasEmergencyFlag(flags: EmergencyFlags | null | undefined): boolean {
  if (!flags) return false;
  return Boolean(flags.nausea || flags.abdominalPain || flags.shortnessOfBreath || flags.extremeLethargy);
}

/**
 * Determine the Zone 1 alert state from the most recent reading.
 * DKA takes precedence: >= 250, or >= 200 with at least one emergency flag.
 * Otherwise >= 200 triggers the 200+ Rescue Protocol.
 */
export function evaluateAlert(valueMgPerDl: number | null | undefined, flags?: EmergencyFlags | null): AlertLevel {
  if (valueMgPerDl == null) return 'NONE';
  if (valueMgPerDl >= DKA_ABSOLUTE_THRESHOLD_MG_DL) return 'DKA';
  if (valueMgPerDl >= RESCUE_THRESHOLD_MG_DL) return hasEmergencyFlag(flags) ? 'DKA' : 'RESCUE';
  return 'NONE';
}

export const RESCUE_STEPS = [
  {
    key: 'hydration',
    icon: '💧',
    label: 'I have consumed 500ml of pure water now.',
    subtext: 'Enables renal filtration to excrete excess blood glucose through urine.',
  },
  {
    key: 'walking',
    icon: '🚶‍♂️',
    label: 'I completed 15–20 minutes of light walking.',
    subtext: 'Stimulates skeletal muscle glucose uptake completely independent of insulin availability.',
  },
  {
    key: 'posture',
    icon: '🧘‍♂️',
    label: 'I am maintaining an upright posture for the next 2 hours.',
    subtext: 'Prevents intra-abdominal pressure, eliminating gas fermentation and continuous burping.',
  },
] as const;

export type RescueStepKey = (typeof RESCUE_STEPS)[number]['key'];

export function recalibrationDeadline(measuredAt: Date): Date {
  return new Date(measuredAt.getTime() + RECALIBRATION_MINUTES * 60_000);
}

/** Remaining countdown in whole seconds (never negative). */
export function secondsRemaining(deadline: Date, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 1000));
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
