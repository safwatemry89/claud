import { Router } from 'express';
import { z } from 'zod';
import { adherencePercent } from '@m90/core';
import type { AuthedRequest } from '../auth';
import { prisma } from '../db';
import { endOfToday, startOfToday } from '../time';

export const medicationsRouter = Router();

medicationsRouter.get('/today', async (req, res) => {
  const { userId } = req as AuthedRequest;
  const doses = await prisma.medicationLog.findMany({
    where: { userId, scheduledTime: { gte: startOfToday(), lt: endOfToday() } },
    orderBy: { scheduledTime: 'asc' },
  });
  res.json({ doses, adherencePercent: adherencePercent(doses) });
});

const createSchema = z.object({
  medName: z.string().trim().min(1).max(100),
  doseTaken: z.string().trim().min(1).max(100),
  scheduledTime: z.coerce.date(),
  takenAt: z.coerce.date().optional(),
  isMissed: z.boolean().default(false),
});

medicationsRouter.post('/', async (req, res) => {
  const { userId } = req as AuthedRequest;
  const input = createSchema.parse(req.body);
  const dose = await prisma.medicationLog.create({ data: { userId, ...input } });
  res.status(201).json(dose);
});

medicationsRouter.patch('/:id', async (req, res) => {
  const { userId } = req as AuthedRequest;
  const input = z.object({ isMissed: z.boolean() }).parse(req.body);
  // Scope by userId so users cannot modify each other's records.
  const { count } = await prisma.medicationLog.updateMany({
    where: { id: req.params.id, userId },
    data: { isMissed: input.isMissed, ...(input.isMissed ? {} : { takenAt: new Date() }) },
  });
  if (count === 0) return res.status(404).json({ error: 'Not found' });
  res.json(await prisma.medicationLog.findUnique({ where: { id: req.params.id } }));
});
