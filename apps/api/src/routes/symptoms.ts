import { Router } from 'express';
import { z } from 'zod';
import { evaluateAlert } from '@m90/core';
import type { AuthedRequest } from '../auth';
import { prisma } from '../db';

export const symptomSchema = z.object({
  continuousBurping: z.boolean().default(false),
  bloating: z.boolean().default(false),
  nausea: z.boolean().default(false),
  abdominalPain: z.boolean().default(false),
  extremeLethargy: z.boolean().default(false),
  shortnessOfBreath: z.boolean().default(false),
  severityScore: z.number().int().min(1).max(10).default(1),
});

export const symptomsRouter = Router();

/** Symptoms logged standalone are linked to a glucose reading from the last 2 hours, if any, and re-evaluated for DKA. */
symptomsRouter.post('/', async (req, res) => {
  const { userId } = req as AuthedRequest;
  const input = symptomSchema.parse(req.body);
  const recent = await prisma.glucoseLog.findFirst({
    where: { userId, measuredAt: { gte: new Date(Date.now() - 2 * 3_600_000) } },
    orderBy: { measuredAt: 'desc' },
  });
  const log = await prisma.symptomLog.create({ data: { userId, glucoseLogId: recent?.id, ...input } });
  res.status(201).json({ log, alert: evaluateAlert(recent?.valueMgPerDl, input) });
});
