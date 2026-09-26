export interface MedicationDose {
  medName: string;
  scheduledTime: Date;
  takenAt?: Date | null;
  isMissed?: boolean;
}

/** Grace window after the scheduled time before a dose counts as missed. */
export const DOSE_GRACE_MINUTES = 60;

export function isDoseMissed(dose: MedicationDose, now: Date = new Date()): boolean {
  if (dose.isMissed) return true;
  if (dose.takenAt) return false;
  return now.getTime() > dose.scheduledTime.getTime() + DOSE_GRACE_MINUTES * 60_000;
}

export function adherencePercent(doses: MedicationDose[], now: Date = new Date()): number | null {
  const due = doses.filter((d) => d.scheduledTime <= now);
  if (due.length === 0) return null;
  const taken = due.filter((d) => !isDoseMissed(d, now) && d.takenAt).length;
  return Math.round((taken / due.length) * 100);
}

/**
 * On a spike (>= 200 mg/dL) check whether any dose within the preceding window was missed.
 * Returns the missed doses so the UI can name them.
 */
export function missedDosesBeforeSpike(
  doses: MedicationDose[],
  spikeAt: Date,
  lookbackHours = 24,
): MedicationDose[] {
  const from = spikeAt.getTime() - lookbackHours * 3_600_000;
  return doses.filter(
    (d) => d.scheduledTime.getTime() >= from && d.scheduledTime <= spikeAt && isDoseMissed(d, spikeAt),
  );
}
