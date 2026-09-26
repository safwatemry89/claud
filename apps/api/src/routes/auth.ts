import { Prisma } from '@prisma/client';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { signToken } from '../auth';
import { consumeToken, issueToken } from '../authTokens';
import { config } from '../config';
import { prisma } from '../db';
import { sendMail } from '../mailer';
import { dummyPasswordHash, hashPassword, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, verifyPassword } from '../passwords';

export const authRouter = Router();

// Slows password guessing: 10 failed attempts per IP per 15 minutes. Successful sign-ins do not count.
authRouter.use(rateLimit({ windowMs: 15 * 60_000, limit: 10, skipSuccessfulRequests: true, standardHeaders: 'draft-7', legacyHeaders: false }));

/** Every request counts, so the emailing endpoints cannot be used to flood someone's inbox. */
export const emailLimiter = rateLimit({ windowMs: 60 * 60_000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false });

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH);
const linkToken = z.string().min(20).max(100);
const publicUser = { id: true, email: true, name: true, createdAt: true, emailVerifiedAt: true } as const;

export async function sendVerificationEmail(userId: string, to: string) {
  const token = await issueToken(userId, 'VERIFY_EMAIL');
  await sendMail(to, 'Confirm your Metabolic-90 email',
    `Confirm your email address by opening this link within 24 hours:\n\n${config.appUrl}/?verify=${token}\n\nIf you did not create a Metabolic-90 account, you can ignore this email.`);
}

authRouter.post('/register', async (req, res) => {
  const body = z.object({ email, password, name: z.string().trim().max(100).optional() }).parse(req.body);
  const passwordHash = await hashPassword(body.password);
  const user = await prisma.user
    .create({ data: { email: body.email, name: body.name || null, passwordHash }, select: { ...publicUser, tokenVersion: true } })
    .catch((e) => {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return null;
      throw e;
    });
  if (!user) return res.status(409).json({ error: 'An account with this email already exists' });
  // The account works right away; a failed email only means the user has to ask for a new link.
  await sendVerificationEmail(user.id, user.email).catch((err) => console.error('verification email failed', err));
  const { tokenVersion, ...safe } = user;
  res.status(201).json({ token: signToken(user.id, tokenVersion), user: safe });
});

authRouter.post('/login', async (req, res) => {
  const body = z.object({ email, password: z.string().max(MAX_PASSWORD_LENGTH) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email }, select: { ...publicUser, passwordHash: true, tokenVersion: true } });
  const ok = await verifyPassword(body.password, user?.passwordHash ?? (await dummyPasswordHash()));
  if (!user?.passwordHash || !ok) return res.status(401).json({ error: 'Incorrect email or password' });
  const { passwordHash: _, tokenVersion, ...safe } = user;
  res.json({ token: signToken(user.id, tokenVersion), user: safe });
});

authRouter.post('/verify-email', async (req, res) => {
  const { token } = z.object({ token: linkToken }).parse(req.body);
  const userId = await consumeToken(token, 'VERIFY_EMAIL');
  if (!userId) return res.status(400).json({ error: 'This link is invalid or has expired' });
  await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  res.json({ verified: true });
});

/** Always answers the same way, so it does not reveal whether an email has an account. */
authRouter.post('/forgot-password', emailLimiter, async (req, res) => {
  const body = z.object({ email }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true, email: true } });
  if (user) {
    // Not awaited: answering before the email goes out keeps response time the same for unknown emails.
    void (async () => {
      const token = await issueToken(user.id, 'RESET_PASSWORD');
      await sendMail(user.email, 'Reset your Metabolic-90 password',
        `Choose a new password by opening this link within 1 hour:\n\n${config.appUrl}/?reset=${token}\n\nIf you did not ask for this, you can ignore this email. Your password has not changed.`);
    })().catch((err) => console.error('reset email failed', err));
  }
  res.status(202).json({ message: 'If an account exists for that email, a reset link is on its way.' });
});

authRouter.post('/reset-password', async (req, res) => {
  const body = z.object({ token: linkToken, password }).parse(req.body);
  const userId = await consumeToken(body.token, 'RESET_PASSWORD');
  if (!userId) return res.status(400).json({ error: 'This link is invalid or has expired' });
  // Opening the emailed link proves the address, and bumping tokenVersion signs out every other session.
  const user = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(body.password), tokenVersion: { increment: 1 }, emailVerifiedAt: new Date() },
    select: { ...publicUser, tokenVersion: true },
  });
  await prisma.authToken.deleteMany({ where: { userId, usedAt: null } });
  const { tokenVersion, ...safe } = user;
  res.json({ token: signToken(user.id, tokenVersion), user: safe });
});

if (config.enableDevLogin) {
  // Development-only passwordless login (ENABLE_DEV_LOGIN=true, never in production).
  authRouter.post('/dev-login', async (req, res) => {
    const body = z.object({ email, name: z.string().max(100).optional() }).parse(req.body);
    const user = await prisma.user.upsert({ where: { email: body.email }, update: {}, create: body, select: { ...publicUser, tokenVersion: true } });
    const { tokenVersion, ...safe } = user;
    res.json({ token: signToken(user.id, tokenVersion), user: safe });
  });
}
