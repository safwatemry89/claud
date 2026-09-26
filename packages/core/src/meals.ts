/** Saturday–Thursday permitted foods (zero-carb). */
export const ZERO_CARB_MENU = {
  proteins: ['Beef', 'Poultry', 'Fish', 'Eggs'],
  dairy: ['Feta', 'Halloumi', 'Labneh', 'Akkawi'],
  vegetables: ['Cucumber', 'Lettuce', 'Spinach', 'Zucchini', 'Broccoli', 'Green Peppers', 'Arugula'],
  forbidden: ['Bread', 'Rice', 'Pasta', 'Potatoes', 'Sugar', 'Fruit juice', 'Sweets'],
} as const;

export const FRIDAY_STEPS = [
  { key: 'fiberConsumedFirst', label: 'Step 1: Salad & Fibers Consumed' },
  { key: 'proteinConsumedSecond', label: 'Step 2: Protein & Fats Consumed' },
  { key: 'carbsConsumedLast', label: 'Step 3: Controlled Complex Carbs Consumed (Max 5 tbsp / 0.5 loaf)' },
] as const;

export type FridayStepKey = (typeof FRIDAY_STEPS)[number]['key'];

export interface GlycemicSequence {
  fiberConsumedFirst: boolean;
  proteinConsumedSecond: boolean;
  carbsConsumedLast: boolean;
}

export const EMPTY_SEQUENCE: GlycemicSequence = {
  fiberConsumedFirst: false,
  proteinConsumedSecond: false,
  carbsConsumedLast: false,
};

/** A step is unlocked only when every earlier step is checked. */
export function isStepUnlocked(seq: GlycemicSequence, step: FridayStepKey): boolean {
  const idx = FRIDAY_STEPS.findIndex((s) => s.key === step);
  return FRIDAY_STEPS.slice(0, idx).every((s) => seq[s.key]);
}

/**
 * Apply a toggle while preserving chronological order.
 * Checking a locked step throws; unchecking a step also unchecks every later step.
 */
export function toggleStep(seq: GlycemicSequence, step: FridayStepKey, checked: boolean): GlycemicSequence {
  const idx = FRIDAY_STEPS.findIndex((s) => s.key === step);
  if (checked) {
    if (!isStepUnlocked(seq, step)) throw new Error(`${FRIDAY_STEPS[idx]!.label} is locked until previous steps are complete.`);
    return { ...seq, [step]: true };
  }
  const next = { ...seq };
  FRIDAY_STEPS.slice(idx).forEach((s) => (next[s.key] = false));
  return next;
}

export function isSequenceValid(seq: GlycemicSequence): boolean {
  return FRIDAY_STEPS.every((s) => !seq[s.key] || isStepUnlocked(seq, s.key));
}

/**
 * Compliance: on non-Friday days any carbs is non-compliant.
 * On Friday, carbs are compliant only if consumed after fiber and protein.
 */
export function isMealCompliant(seq: GlycemicSequence, isFriday: boolean): boolean {
  if (!isFriday) return !seq.carbsConsumedLast;
  return isSequenceValid(seq);
}
