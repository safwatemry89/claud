export type RitualStatus = 'CHECKED' | 'MISSED' | 'ACTIVE' | 'PENDING' | 'UPCOMING';

export interface RitualInput {
  now: Date;
  okraTakenAt?: Date | null;
  /** Next planned meal time today, if known. */
  nextMealAt?: Date | null;
  /** Most recent meal finished today, if any. */
  lastMealAt?: Date | null;
  cinnamonDone?: boolean;
  greenTeaDone?: boolean;
}

export interface RitualView {
  key: 'okra' | 'cinnamon' | 'greenTea';
  icon: string;
  when: string;
  title: string;
  status: RitualStatus;
}

const OKRA_HOUR = 7;
const OKRA_GRACE_MIN = 120;

export function ritualStatuses(i: RitualInput): RitualView[] {
  const okraDeadline = new Date(i.now);
  okraDeadline.setHours(OKRA_HOUR, OKRA_GRACE_MIN, 0, 0);
  const okraStatus: RitualStatus = i.okraTakenAt ? 'CHECKED' : i.now > okraDeadline ? 'MISSED' : 'PENDING';

  let cinnamon: RitualStatus = 'UPCOMING';
  if (i.cinnamonDone) cinnamon = 'CHECKED';
  else if (i.nextMealAt) {
    const minsToMeal = (i.nextMealAt.getTime() - i.now.getTime()) / 60_000;
    if (minsToMeal <= 20 && minsToMeal >= 0) cinnamon = 'ACTIVE';
    else if (minsToMeal < 0) cinnamon = 'MISSED';
  }

  let greenTea: RitualStatus = 'UPCOMING';
  if (i.greenTeaDone) greenTea = 'CHECKED';
  else if (i.lastMealAt) {
    const minsSince = (i.now.getTime() - i.lastMealAt.getTime()) / 60_000;
    if (minsSince < 45) greenTea = 'PENDING';
    else if (minsSince <= 90) greenTea = 'ACTIVE';
    else greenTea = 'MISSED';
  }

  return [
    { key: 'okra', icon: '🌅', when: '07:00 AM', title: 'Okra Water Mucilage Drink', status: okraStatus },
    { key: 'cinnamon', icon: '🍵', when: '20 Mins Pre-Meal', title: 'Cinnamon Infusion Protocol', status: cinnamon },
    { key: 'greenTea', icon: '🌿', when: '45 Mins Post-Meal', title: 'Green Tea Clearance Process', status: greenTea },
  ];
}
