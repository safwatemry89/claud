import { SAFETY_CEILING_MG_DL } from './glucose';

export interface Reading {
  valueMgPerDl: number;
  measuredAt: Date;
}

export interface GlycemicSummary {
  count: number;
  meanMgPerDl: number | null;
  stdDevMgPerDl: number | null;
  /** Coefficient of variation in %, >36% indicates unstable glycemia. */
  cvPercent: number | null;
  /** ADAG estimated A1c: (mean + 46.7) / 28.7 */
  eA1cPercent: number | null;
  /** Glucose Management Indicator: 3.31 + 0.02392 × mean */
  gmiPercent: number | null;
  timeInRangePercent: number | null; // 70–180
  timeAboveCeilingPercent: number | null; // >180
  timeBelowRangePercent: number | null; // <70
  /** mg/dL per hour between the two most recent readings. */
  velocityMgPerDlPerHour: number | null;
  /** Least-squares slope across the window, mg/dL per day. */
  trendMgPerDlPerDay: number | null;
}

const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;

export function estimateA1c(meanMgPerDl: number): number {
  return round((meanMgPerDl + 46.7) / 28.7, 2);
}

export function glucoseManagementIndicator(meanMgPerDl: number): number {
  return round(3.31 + 0.02392 * meanMgPerDl, 2);
}

/** Inverse ADAG: the mean glucose required to hit a target A1c. */
export function meanForTargetA1c(targetA1cPercent: number): number {
  return Math.round(28.7 * targetA1cPercent - 46.7);
}

export function summarize(readings: Reading[]): GlycemicSummary {
  const n = readings.length;
  if (n === 0) {
    return {
      count: 0, meanMgPerDl: null, stdDevMgPerDl: null, cvPercent: null, eA1cPercent: null,
      gmiPercent: null, timeInRangePercent: null, timeAboveCeilingPercent: null,
      timeBelowRangePercent: null, velocityMgPerDlPerHour: null, trendMgPerDlPerDay: null,
    };
  }
  const values = readings.map((r) => r.valueMgPerDl);
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1 ? values.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1) : 0;
  const sd = Math.sqrt(variance);
  const pct = (pred: (v: number) => boolean) => round((values.filter(pred).length / n) * 100);

  const sorted = [...readings].sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());
  let velocity: number | null = null;
  if (n >= 2) {
    const a = sorted[n - 2]!;
    const b = sorted[n - 1]!;
    const hours = (b.measuredAt.getTime() - a.measuredAt.getTime()) / 3_600_000;
    velocity = hours > 0 ? round((b.valueMgPerDl - a.valueMgPerDl) / hours) : null;
  }

  return {
    count: n,
    meanMgPerDl: round(mean),
    stdDevMgPerDl: round(sd),
    cvPercent: mean > 0 ? round((sd / mean) * 100) : null,
    eA1cPercent: estimateA1c(mean),
    gmiPercent: glucoseManagementIndicator(mean),
    timeInRangePercent: pct((v) => v >= 70 && v <= SAFETY_CEILING_MG_DL),
    timeAboveCeilingPercent: pct((v) => v > SAFETY_CEILING_MG_DL),
    timeBelowRangePercent: pct((v) => v < 70),
    velocityMgPerDlPerHour: velocity,
    trendMgPerDlPerDay: linearSlopePerDay(sorted),
  };
}

function linearSlopePerDay(sorted: Reading[]): number | null {
  if (sorted.length < 2) return null;
  const t0 = sorted[0]!.measuredAt.getTime();
  const xs = sorted.map((r) => (r.measuredAt.getTime() - t0) / 86_400_000);
  const ys = sorted.map((r) => r.valueMgPerDl);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => {
    num += (x - mx) * (ys[i]! - my);
    den += (x - mx) ** 2;
  });
  return den === 0 ? null : round(num / den);
}

export interface A1cProjection {
  currentEA1c: number | null;
  /** Projected eA1c at program day 90 assuming the current daily trend continues, bounded to plausible values. */
  projectedDay90EA1c: number | null;
  daysRemaining: number;
}

/**
 * Project eA1c at day 90 by extrapolating the recent mean along the least-squares trend.
 * Deliberately conservative: the projected mean is clamped to 70–400 mg/dL.
 */
export function projectA1c(readings: Reading[], currentDay: number, totalDays = 90): A1cProjection {
  const s = summarize(readings);
  const daysRemaining = Math.max(0, totalDays - currentDay);
  if (s.meanMgPerDl == null) return { currentEA1c: null, projectedDay90EA1c: null, daysRemaining };
  const slope = s.trendMgPerDlPerDay ?? 0;
  const projectedMean = Math.min(400, Math.max(70, s.meanMgPerDl + slope * daysRemaining));
  return { currentEA1c: s.eA1cPercent, projectedDay90EA1c: estimateA1c(projectedMean), daysRemaining };
}
