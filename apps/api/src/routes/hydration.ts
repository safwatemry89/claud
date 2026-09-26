import { Router } from 'express';
import { z } from 'zod';
import { CUP_ML, hydrationStatus } from '@m90/core';
import type { AuthedRequest } from '../auth';
import { prisma } from '../db';
import { endOfToday, startOfToday } from '../time';

export const hydrationRouter = Router();

export async function todayHydration(userId: string) {
  const agg = await prisma.hydrationLog.aggregate({
    where: { userId, loggedAt: { gte: startOfToday(), lt: endOfToday() } },
    _sum: { amountMl: true },
  });
  return hydrationStatus(agg._sum.amountMl ?? 0);
}

hydrationRouter.get('/today', async (req, res) => {
  res.json(await todayHydration((req as AuthedRequest).userId));
});

hydrationRouter.post('/', async (req, res) => {
  const { userId } = req as AuthedRequest;
  const { amountMl } = z.object({ amountMl: z.number().int().min(1).max(2000).default(CUP_ML) }).parse(req.body ?? {});
  await prisma.hydrationLog.create({ data: { userId, amountMl } });
  res.status(201).json(await todayHydration(userId));
});

/** Undo the most recent cup logged today (tapping a filled dot). */
hydrationRouter.delete('/last', async (req, res) => {
  const { userId } = req as AuthedRequest;
  const last = await prisma.hydrationLog.findFirst({
    where: { userId, loggedAt: { gte: startOfToday(), lt: endOfToday() } },
    orderBy: { loggedAt: 'desc' },
  });
  if (last) await prisma.hydrationLog.delete({ where: { id: last.id } });
  res.json(await todayHydration(userId));
});
