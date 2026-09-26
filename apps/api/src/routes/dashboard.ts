import { Router } from 'express';
import {
  evaluateAlert, greeting, isCarbCycleDay, phaseFor, projectA1c, recalibrationDeadline, summarize,
} from '@m90/core';
import type { AuthedRequest } from '../auth';
import { prisma } from '../db';
import { syncProgramState } from '../program';
import { todayHydration } from './hydration';

export const dashboardRouter = Router();

dashboardRouter.get('/', async (req, res) => {
  const { userId } = req as AuthedRequest;
  const now = new Date();
  const state = await syncProgramState(userId, now);

  const [latest, window] = await Promise.all([
    prisma.glucoseLog.findFirst({ where: { userId }, orderBy: { measuredAt: 'desc' }, include: { symptomLogs: true } }),
    prisma.glucoseLog.findMany({
      where: { userId, measuredAt: { gte: new Date(now.getTime() - 14 * 86_400_000) } },
      select: { valueMgPerDl: true, measuredAt: true },
    }),
  ]);

  // DKA flags: symptoms attached to the reading, or logged standalone within 2h after it.
  const flags = latest
    ? await prisma.symptomLog.findMany({
        where: { userId, OR: [{ glucoseLogId: latest.id }, { loggedAt: { gte: latest.measuredAt, lte: new Date(latest.measuredAt.getTime() + 2 * 3_600_000) } }] },
      })
    : [];
  const merged = flags.reduce(
    (a, s) => ({
      nausea: a.nausea || s.nausea, abdominalPain: a.abdominalPain || s.abdominalPain,
      shortnessOfBreath: a.shortnessOfBreath || s.shortnessOfBreath, extremeLethargy: a.extremeLethargy || s.extremeLethargy,
    }),
    { nausea: false, abdominalPain: false, shortnessOfBreath: false, extremeLethargy: false },
  );
  const alert = evaluateAlert(latest?.valueMgPerDl, merged);

  res.json({
    program: { ...state, phase: phaseFor(state.currentDayNumber).name, greeting: greeting(state.currentDayNumber), isCarbCycleDay: isCarbCycleDay(now) },
    latest,
    alert,
    recalibrateAt: alert === 'RESCUE' && latest ? recalibrationDeadline(latest.measuredAt) : null,
    analytics: { ...summarize(window), projection: projectA1c(window, state.currentDayNumber) },
    hydration: await todayHydration(userId),
  });
});
