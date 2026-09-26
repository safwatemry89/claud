import { Router } from 'express';
import { z } from 'zod';
import type { AuthedRequest } from '../auth';
import { prisma } from '../db';

export const rescueRouter = Router();

const select = { glucoseLogId: true, hydration: true, walking: true, posture: true } as const;

async function ownsReading(userId: string, glucoseLogId: string) {
  return Boolean(await prisma.glucoseLog.findFirst({ where: { id: glucoseLogId, userId }, select: { id: true } }));
}

/** Rescue Protocol checklist for the spike reading `:glucoseLogId`. */
rescueRouter.get('/:glucoseLogId', async (req, res) => {
  const { userId } = req as AuthedRequest;
  const { glucoseLogId } = req.params;
  if (!(await ownsReading(userId, glucoseLogId))) return res.status(404).json({ error: 'Not found' });
  const row = await prisma.rescueCheck.findUnique({ where: { glucoseLogId }, select });
  res.json(row ?? { glucoseLogId, hydration: false, walking: false, posture: false });
});

rescueRouter.put('/:glucoseLogId', async (req, res) => {
  const { userId } = req as AuthedRequest;
  const { glucoseLogId } = req.params;
  const data = z.object({ hydration: z.boolean(), walking: z.boolean(), posture: z.boolean() }).partial().parse(req.body);
  if (!(await ownsReading(userId, glucoseLogId))) return res.status(404).json({ error: 'Not found' });
  const row = await prisma.rescueCheck.upsert({ where: { glucoseLogId }, update: data, create: { userId, glucoseLogId, ...data }, select });
  res.json(row);
});
