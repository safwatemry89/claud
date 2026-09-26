import { Router } from 'express';
import { z } from 'zod';
import type { AuthedRequest } from '../auth';
import { prisma } from '../db';

export const ritualsRouter = Router();

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM');
const select = { date: true, okraTakenAt: true, cinnamonDone: true, greenTeaDone: true, nextMealTime: true, lastMealTime: true } as const;

/** The client's local date, so "today" follows the user's time zone rather than the server's. */
ritualsRouter.get('/:date', async (req, res) => {
  const day = date.parse(req.params.date);
  const row = await prisma.ritualLog.findUnique({ where: { userId_date: { userId: (req as AuthedRequest).userId, date: day } }, select });
  res.json(row ?? { date: day, okraTakenAt: null, cinnamonDone: false, greenTeaDone: false, nextMealTime: null, lastMealTime: null });
});

const updateSchema = z
  .object({
    okraTakenAt: z.coerce.date().nullable(),
    cinnamonDone: z.boolean(),
    greenTeaDone: z.boolean(),
    nextMealTime: time.nullable(),
    lastMealTime: time.nullable(),
  })
  .partial();

ritualsRouter.put('/:date', async (req, res) => {
  const { userId } = req as AuthedRequest;
  const day = date.parse(req.params.date);
  const data = updateSchema.parse(req.body);
  const row = await prisma.ritualLog.upsert({
    where: { userId_date: { userId, date: day } },
    update: data,
    create: { userId, date: day, ...data },
    select,
  });
  res.json(row);
});
