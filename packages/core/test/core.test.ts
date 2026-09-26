import { describe, expect, it } from 'vitest';
import {
  classifyGlucose, evaluateAlert, estimateA1c, glucoseManagementIndicator, summarize, projectA1c,
  programDayNumber, weekCycle, dayOfWeek, phaseFor, greeting, toggleStep, isStepUnlocked,
  EMPTY_SEQUENCE, isMealCompliant, hydrationStatus, missedDosesBeforeSpike, formatCountdown,
  recalibrationDeadline, secondsRemaining, ritualStatuses,
} from '../src';

describe('classifyGlucose', () => {
  it.each([
    [99, 'FASTING', 'OPTIMAL'], [100, 'FASTING', 'ELEVATED'], [125, 'BEFORE_MEAL', 'ELEVATED'],
    [126, 'FASTING', 'HIGH'], [139, 'AFTER_MEAL', 'OPTIMAL'], [140, 'AFTER_MEAL', 'ELEVATED'],
    [199, 'RANDOM', 'ELEVATED'], [200, 'AFTER_MEAL', 'HIGH'],
  ] as const)('%i %s -> %s', (v, ctx, expected) => expect(classifyGlucose(v, ctx)).toBe(expected));

  it('rejects implausible values', () => {
    expect(() => classifyGlucose(5, 'FASTING')).toThrow(RangeError);
    expect(() => classifyGlucose(120.5, 'FASTING')).toThrow(RangeError);
  });
});

describe('evaluateAlert', () => {
  it('none below 200', () => expect(evaluateAlert(199, { nausea: true })).toBe('NONE'));
  it('rescue at 200 with no flags', () => expect(evaluateAlert(200)).toBe('RESCUE'));
  it('DKA at 200 with a flag', () => expect(evaluateAlert(226, { shortnessOfBreath: true })).toBe('DKA'));
  it('DKA at 250 regardless', () => expect(evaluateAlert(250)).toBe('DKA'));
  it('ignores non-emergency symptoms', () => expect(evaluateAlert(210, {})).toBe('RESCUE'));
});

describe('analytics', () => {
  it('ADAG and GMI', () => {
    expect(estimateA1c(154)).toBe(6.99);
    expect(glucoseManagementIndicator(154)).toBe(6.99);
  });
  it('summarizes readings', () => {
    const t = new Date('2026-01-01T08:00:00');
    const r = [100, 200, 150].map((v, i) => ({ valueMgPerDl: v, measuredAt: new Date(t.getTime() + i * 3_600_000) }));
    const s = summarize(r);
    expect(s.meanMgPerDl).toBe(150);
    expect(s.timeAboveCeilingPercent).toBe(33.3);
    expect(s.velocityMgPerDlPerHour).toBe(-50);
  });
  it('projects a falling trend downward', () => {
    const r = Array.from({ length: 10 }, (_, i) => ({ valueMgPerDl: 200 - i * 5, measuredAt: new Date(2026, 0, i + 1) }));
    const p = projectA1c(r, 10);
    expect(p.projectedDay90EA1c!).toBeLessThan(p.currentEA1c!);
    expect(p.daysRemaining).toBe(80);
  });
  it('empty summary', () => expect(summarize([]).eA1cPercent).toBeNull());
});

describe('program', () => {
  it('day number and clamping', () => {
    const start = new Date(2026, 0, 1, 23, 0);
    expect(programDayNumber(start, new Date(2026, 0, 1, 1))).toBe(1);
    expect(programDayNumber(start, new Date(2026, 0, 2, 0, 5))).toBe(2);
    expect(programDayNumber(start, new Date(2027, 0, 1))).toBe(90);
  });
  it('week cycle loops 1..4', () => {
    expect([1, 7, 8, 28, 29, 90].map(weekCycle)).toEqual([1, 1, 2, 4, 1, 1]);
  });
  it('day of week', () => expect(dayOfWeek(new Date(2026, 8, 25))).toBe('FRIDAY'));
  it('greeting', () => {
    expect(greeting(3)).toBe('Hello! You are on Day 3 of your Metabolic-90 Journey. Current Phase: Zero-Carb Adaptation.');
    expect(phaseFor(90).name).toBe('Metabolic Consolidation');
  });
});

describe('Friday glycemic sequence', () => {
  it('locks step 3 until 1 and 2', () => {
    expect(isStepUnlocked(EMPTY_SEQUENCE, 'carbsConsumedLast')).toBe(false);
    expect(() => toggleStep(EMPTY_SEQUENCE, 'carbsConsumedLast', true)).toThrow();
    let s = toggleStep(EMPTY_SEQUENCE, 'fiberConsumedFirst', true);
    expect(() => toggleStep(s, 'carbsConsumedLast', true)).toThrow();
    s = toggleStep(s, 'proteinConsumedSecond', true);
    s = toggleStep(s, 'carbsConsumedLast', true);
    expect(s.carbsConsumedLast).toBe(true);
  });
  it('unchecking cascades', () => {
    const full = { fiberConsumedFirst: true, proteinConsumedSecond: true, carbsConsumedLast: true };
    expect(toggleStep(full, 'fiberConsumedFirst', false)).toEqual(EMPTY_SEQUENCE);
  });
  it('compliance', () => {
    expect(isMealCompliant({ ...EMPTY_SEQUENCE, carbsConsumedLast: true }, false)).toBe(false);
    expect(isMealCompliant({ ...EMPTY_SEQUENCE, carbsConsumedLast: true }, true)).toBe(false);
  });
});

describe('hydration', () => {
  it('computes deficit', () => {
    const s = hydrationStatus(250, new Date(2026, 0, 1, 14, 30)); // midway -> 1000 expected
    expect(s.expectedMl).toBe(1000);
    expect(s.deficitMl).toBe(750);
    expect(s.behindSchedule).toBe(true);
    expect(s.cupsFilled).toBe(1);
  });
});

describe('medication', () => {
  it('flags missed doses before a spike', () => {
    const spike = new Date(2026, 0, 1, 14);
    const doses = [
      { medName: 'Metformin', scheduledTime: new Date(2026, 0, 1, 8), takenAt: null },
      { medName: 'Vit D', scheduledTime: new Date(2026, 0, 1, 9), takenAt: new Date(2026, 0, 1, 9) },
    ];
    expect(missedDosesBeforeSpike(doses, spike).map((d) => d.medName)).toEqual(['Metformin']);
  });
});

describe('recalibration countdown', () => {
  it('60 minutes', () => {
    const at = new Date(2026, 0, 1, 10);
    const d = recalibrationDeadline(at);
    expect(formatCountdown(secondsRemaining(d, at))).toBe('60:00');
    expect(secondsRemaining(d, new Date(2026, 0, 1, 12))).toBe(0);
  });
});

describe('rituals', () => {
  it('okra missed after grace window', () => {
    const r = ritualStatuses({ now: new Date(2026, 0, 1, 10) });
    expect(r[0]!.status).toBe('MISSED');
  });
});
