import { Router } from 'express';
import { z } from 'zod';
import type { AuthedRequest } from '../auth';
import { prisma } from '../db';
import { emailLimiter, sendVerificationEmail } from './auth';

export const usersRouter = Router();

usersRouter.get('/me', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: (req as AuthedRequest).userId },
    select: { id: true, email: true, name: true, createdAt: true, emailVerifiedAt: true, programState: true },
  });
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

usersRouter.put('/me/push-token', async (req, res) => {
  const { pushToken } = z.object({ pushToken: z.string().min(10).max(255).nullable() }).parse(req.body);
  await prisma.user.update({ where: { id: (req as AuthedRequest).userId }, data: { pushToken } });
  res.status(204).end();
});

/** Right to erasure: cascades to every log via onDelete: Cascade. */
usersRouter.delete('/me', async (req, res) => {
  await prisma.user.delete({ where: { id: (req as AuthedRequest).userId } });
  res.status(204).end();
});

/** Sends a fresh email confirmation link. */
usersRouter.post('/me/verify-email', emailLimiter, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: (req as AuthedRequest).userId }, select: { id: true, email: true, emailVerifiedAt: true } });
  if (!user) return res.status(404).json({ error: 'Not found' });
  if (user.emailVerifiedAt) return res.status(409).json({ error: 'Your email is already confirmed' });
  await sendVerificationEmail(user.id, user.email);
  res.status(202).json({ message: 'Confirmation email sent' });
});
