export type GlucoseContext = 'FASTING' | 'BEFORE_MEAL' | 'AFTER_MEAL' | 'RANDOM';
export type GlucoseStatus = 'OPTIMAL' | 'ELEVATED' | 'HIGH';

export const ZONE_COLORS: Record<GlucoseStatus, string> = {
  OPTIMAL: '#10B981',
  ELEVATED: '#F59E0B',
  HIGH: '#EF4444',
};

/** Visual safety ceiling drawn on the trendline and used for recalibration checks. */
export const SAFETY_CEILING_MG_DL = 180;
export const RESCUE_THRESHOLD_MG_DL = 200;
export const DKA_ABSOLUTE_THRESHOLD_MG_DL = 250;

/** Physiologically plausible meter range; anything outside is rejected as a data-entry error. */
export const MIN_VALID_MG_DL = 20;
export const MAX_VALID_MG_DL = 600;

/** Fasting and pre-meal readings use fasting thresholds; after-meal and random use post-meal thresholds. */
export function usesFastingThresholds(context: GlucoseContext): boolean {
  return context === 'FASTING' || context === 'BEFORE_MEAL';
}

export function classifyGlucose(valueMgPerDl: number, context: GlucoseContext): GlucoseStatus {
  assertValidGlucose(valueMgPerDl);
  if (usesFastingThresholds(context)) {
    if (valueMgPerDl < 100) return 'OPTIMAL';
    if (valueMgPerDl < 126) return 'ELEVATED';
    return 'HIGH';
  }
  if (valueMgPerDl < 140) return 'OPTIMAL';
  if (valueMgPerDl < 200) return 'ELEVATED';
  return 'HIGH';
}

export function assertValidGlucose(valueMgPerDl: number): void {
  if (!Number.isInteger(valueMgPerDl) || valueMgPerDl < MIN_VALID_MG_DL || valueMgPerDl > MAX_VALID_MG_DL) {
    throw new RangeError(
      `Glucose must be an integer between ${MIN_VALID_MG_DL} and ${MAX_VALID_MG_DL} mg/dL (got ${valueMgPerDl}).`,
    );
  }
}

export const CONTEXT_LABELS: Record<GlucoseContext, string> = {
  FASTING: 'Fasting',
  BEFORE_MEAL: 'Before Meal',
  AFTER_MEAL: 'Post-Meal',
  RANDOM: 'Random',
};

export function formatElapsed(measuredAt: Date, now: Date = new Date()): string {
  const mins = Math.max(0, Math.floor((now.getTime() - measuredAt.getTime()) / 60_000));
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
