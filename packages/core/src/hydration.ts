export const CUP_ML = 250;
export const DAILY_CUPS = 8;
export const DAILY_TARGET_ML = CUP_ML * DAILY_CUPS;

/** Waking window across which the 2 L target is spread. */
export const HYDRATION_WINDOW = { startHour: 7, endHour: 22 };

/** Expected cumulative intake at `now`, linearly across the waking window. */
export function expectedIntakeMl(now: Date = new Date()): number {
  const { startHour, endHour } = HYDRATION_WINDOW;
  const hour = now.getHours() + now.getMinutes() / 60;
  if (hour <= startHour) return 0;
  if (hour >= endHour) return DAILY_TARGET_ML;
  return Math.round(((hour - startHour) / (endHour - startHour)) * DAILY_TARGET_ML);
}

export interface HydrationStatus {
  consumedMl: number;
  targetMl: number;
  expectedMl: number;
  deficitMl: number; // behind schedule (0 if on track)
  remainingMl: number; // to daily target
  cupsFilled: number;
  behindSchedule: boolean;
}

export function hydrationStatus(consumedMl: number, now: Date = new Date()): HydrationStatus {
  const expected = expectedIntakeMl(now);
  const deficit = Math.max(0, expected - consumedMl);
  return {
    consumedMl,
    targetMl: DAILY_TARGET_ML,
    expectedMl: expected,
    deficitMl: deficit,
    remainingMl: Math.max(0, DAILY_TARGET_ML - consumedMl),
    cupsFilled: Math.min(DAILY_CUPS, Math.floor(consumedMl / CUP_ML)),
    // Only nag when at least one full cup behind.
    behindSchedule: deficit >= CUP_ML,
  };
}
