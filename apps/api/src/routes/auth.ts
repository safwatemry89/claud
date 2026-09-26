import { Prisma } from '@prisma/client';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { signToken } from '../auth';
import { config } from '../config';
import { prisma } from '../db';
import { dummyPasswordHash, hashPassword, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, verifyPassword } from '../passwords';

export const authRouter = Router();

// Slows password guessing: 10 failed attempts per IP per 15 minutes. Successful sign-ins do not count.
authRouter.use(rateLimit({ windowMs: 15 * 60_000, limit: 10, skipSuccessfulRequests: true, standardHeaders: 'draft-7', legacyHeaders: false }));

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH);
const publicUser = { id: true, email: true, name: true, createdAt: true } as const;

authRouter.post('/register', async (req, res) => {
  const body = z.object({ email, password, name: z.string().trim().max(100).optional() }).parse(req.body);
  const passwordHash = await hashPassword(body.password);
  const user = await prisma.user
    .create({ data: { email: body.email, name: body.name || null, passwordHash }, select: publicUser })
    .catch((e) => {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return null;
      throw e;
    });
  if (!user) return res.status(409).json({ error: 'An account with this email already exists' });
  res.status(201).json({ token: signToken(user.id), user });
});

authRouter.post('/login', async (req, res) => {
  const body = z.object({ email, password: z.string().max(MAX_PASSWORD_LENGTH) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email }, select: { ...publicUser, passwordHash: true } });
  const ok = await verifyPassword(body.password, user?.passwordHash ?? (await dummyPasswordHash()));
  if (!user?.passwordHash || !ok) return res.status(401).json({ error: 'Incorrect email or password' });
  const { passwordHash: _, ...safe } = user;
  res.json({ token: signToken(user.id), user: safe });
});

if (config.enableDevLogin) {
  // Development-only passwordless login (ENABLE_DEV_LOGIN=true, never in production).
  authRouter.post('/dev-login', async (req, res) => {
    const body = z.object({ email, name: z.string().max(100).optional() }).parse(req.body);
    const user = await prisma.user.upsert({ where: { email: body.email }, update: {}, create: body, select: publicUser });
    res.json({ token: signToken(user.id), user });
  });
}
