export type DayOfWeek = 'SATURDAY' | 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY';

export const PROGRAM_LENGTH_DAYS = 90;
const MS_PER_DAY = 86_400_000;

const JS_DAY_TO_ENUM: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export function dayOfWeek(date: Date): DayOfWeek {
  return JS_DAY_TO_ENUM[date.getDay()]!;
}

export function isCarbCycleDay(date: Date): boolean {
  return dayOfWeek(date) === 'FRIDAY';
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Calendar program day, 1 on the start date, clamped to 1..90. */
export function programDayNumber(startDate: Date, now: Date = new Date()): number {
  const diff = Math.round((startOfDay(now) - startOfDay(startDate)) / MS_PER_DAY);
  return Math.min(PROGRAM_LENGTH_DAYS, Math.max(1, diff + 1));
}

/** Week cycle loops strictly 1 -> 4 across the 3-month rotation. */
export function weekCycle(dayNumber: number): number {
  return ((Math.ceil(dayNumber / 7) - 1) % 4) + 1;
}

export interface Phase {
  name: string;
  startDay: number;
  endDay: number;
}

export const PHASES: Phase[] = [
  { name: 'Zero-Carb Adaptation', startDay: 1, endDay: 30 },
  { name: 'Carb-Cycling Stabilization', startDay: 31, endDay: 60 },
  { name: 'Metabolic Consolidation', startDay: 61, endDay: 90 },
];

export function phaseFor(dayNumber: number): Phase {
  return PHASES.find((p) => dayNumber >= p.startDay && dayNumber <= p.endDay) ?? PHASES[PHASES.length - 1]!;
}

export function greeting(dayNumber: number): string {
  return `Hello! You are on Day ${dayNumber} of your Metabolic-90 Journey. Current Phase: ${phaseFor(dayNumber).name}.`;
}

export function isProgramComplete(startDate: Date, now: Date = new Date()): boolean {
  return (startOfDay(now) - startOfDay(startDate)) / MS_PER_DAY >= PROGRAM_LENGTH_DAYS;
}
