import { Router } from 'express';
import { z } from 'zod';
import {
  classifyGlucose, evaluateAlert, missedDosesBeforeSpike, recalibrationDeadline,
  MAX_VALID_MG_DL, MIN_VALID_MG_DL, RECALIBRATION_PUSH_TEXT, RESCUE_THRESHOLD_MG_DL, DKA_ALERT_TEXT,
} from '@m90/core';
import type { AuthedRequest } from '../auth';
import { prisma } from '../db';
import { cancelScheduledPush, schedulePush, sendPush } from '../push';
import { symptomSchema } from './symptoms';

export const glucoseRouter = Router();

const createSchema = z.object({
  valueMgPerDl: z.number().int().min(MIN_VALID_MG_DL).max(MAX_VALID_MG_DL),
  context: z.enum(['FASTING', 'BEFORE_MEAL', 'AFTER_MEAL', 'RANDOM']),
  measuredAt: z.coerce.date().optional(),
  notes: z.string().max(500).optional(),
  symptoms: symptomSchema.optional(),
});

glucoseRouter.post('/', async (req, res) => {
  const { userId } = req as AuthedRequest;
  const input = createSchema.parse(req.body);
  const measuredAt = input.measuredAt ?? new Date();
  if (measuredAt.getTime() > Date.now() + 5 * 60_000) {
    return res.status(400).json({ error: 'measuredAt cannot be in the future' });
  }
  const status = classifyGlucose(input.valueMgPerDl, input.context);

  const log = await prisma.glucoseLog.create({
    data: {
      userId, valueMgPerDl: input.valueMgPerDl, context: input.context, status, measuredAt, notes: input.notes,
      ...(input.symptoms && { symptomLogs: { create: { userId, ...input.symptoms } } }),
    },
    include: { symptomLogs: true },
  });

  const alert = evaluateAlert(input.valueMgPerDl, input.symptoms);
  let recalibrateAt: Date | null = null;
  let missedDoses: { medName: string; scheduledTime: Date }[] = [];

  if (alert === 'DKA') {
    cancelScheduledPush(userId);
    void sendPush(userId, 'CRITICAL MEDICAL ALERT', DKA_ALERT_TEXT);
  } else if (alert === 'RESCUE') {
    recalibrateAt = recalibrationDeadline(measuredAt);
    schedulePush(userId, recalibrateAt, 'Recalibration Window', RECALIBRATION_PUSH_TEXT);
  } else {
    cancelScheduledPush(userId);
  }

  if (input.valueMgPerDl >= RESCUE_THRESHOLD_MG_DL) {
    const doses = await prisma.medicationLog.findMany({
      where: { userId, scheduledTime: { gte: new Date(measuredAt.getTime() - 24 * 3_600_000), lte: measuredAt } },
    });
    missedDoses = missedDosesBeforeSpike(doses, measuredAt).map(({ medName, scheduledTime }) => ({ medName, scheduledTime }));
  }

  res.status(201).json({ log, alert, recalibrateAt, missedDoses });
});

const listSchema = z.object({ days: z.coerce.number().int().min(1).max(90).default(14) });

glucoseRouter.get('/', async (req, res) => {
  const { userId } = req as AuthedRequest;
  const { days } = listSchema.parse(req.query);
  const logs = await prisma.glucoseLog.findMany({
    where: { userId, measuredAt: { gte: new Date(Date.now() - days * 86_400_000) } },
    orderBy: { measuredAt: 'asc' },
    include: { symptomLogs: true },
  });
  res.json(logs);
});
