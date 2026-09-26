import { Router } from 'express';
import { z } from 'zod';
import { dayOfWeek, EMPTY_SEQUENCE, isCarbCycleDay, isMealCompliant, toggleStep } from '@m90/core';
import type { AuthedRequest } from '../auth';
import { prisma } from '../db';
import { syncProgramState } from '../program';
import { endOfToday, startOfToday } from '../time';

export const mealsRouter = Router();

async function todayMeal(userId: string) {
  return prisma.mealLog.findFirst({
    where: { userId, loggedAt: { gte: startOfToday(), lt: endOfToday() } },
    orderBy: { loggedAt: 'desc' },
  });
}

mealsRouter.get('/today', async (req, res) => {
  const meal = await todayMeal((req as AuthedRequest).userId);
  res.json({ isCarbCycleDay: isCarbCycleDay(new Date()), meal });
});

const toggleSchema = z.object({
  step: z.enum(['fiberConsumedFirst', 'proteinConsumedSecond', 'carbsConsumedLast']),
  checked: z.boolean(),
});

mealsRouter.put('/today', async (req, res) => {
  const { userId } = req as AuthedRequest;
  const { step, checked } = toggleSchema.parse(req.body);
  const now = new Date();
  const friday = isCarbCycleDay(now);
  const existing = await todayMeal(userId);
  const current = existing
    ? { fiberConsumedFirst: existing.fiberConsumedFirst, proteinConsumedSecond: existing.proteinConsumedSecond, carbsConsumedLast: existing.carbsConsumedLast }
    : EMPTY_SEQUENCE;

  let next;
  try {
    next = toggleStep(current, step, checked);
  } catch (err) {
    return res.status(409).json({ error: (err as Error).message });
  }
  if (!friday && next.carbsConsumedLast) {
    return res.status(409).json({ error: 'Carbohydrates are only permitted on Friday (carb-cycling day).' });
  }

  const data = { ...next, isCompliant: isMealCompliant(next, friday) };
  const meal = existing
    ? await prisma.mealLog.update({ where: { id: existing.id }, data })
    : await prisma.mealLog.create({
        data: { userId, dayOfWeek: dayOfWeek(now), programDayNumber: (await syncProgramState(userId, now)).currentDayNumber, ...data },
      });
  res.json({ isCarbCycleDay: friday, meal });
});
