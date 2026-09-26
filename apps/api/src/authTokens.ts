import { createHash, randomBytes } from 'node:crypto';
import type { AuthTokenPurpose } from '@prisma/client';
import { prisma } from './db';

const TTL_MS: Record<AuthTokenPurpose, number> = {
  VERIFY_EMAIL: 24 * 3_600_000,
  RESET_PASSWORD: 60 * 60_000,
};

const sha256 = (token: string) => createHash('sha256').update(token).digest('hex');

/** Issues a new single-use token and revokes earlier unused ones for the same purpose. Returns the raw token for the link. */
export async function issueToken(userId: string, purpose: AuthTokenPurpose): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await prisma.$transaction([
    prisma.authToken.deleteMany({ where: { userId, purpose, usedAt: null } }),
    prisma.authToken.create({ data: { userId, purpose, tokenHash: sha256(token), expiresAt: new Date(Date.now() + TTL_MS[purpose]) } }),
  ]);
  return token;
}

/** Marks the token used and returns its user id, or null if it is unknown, expired, already used or for another purpose. */
export async function consumeToken(token: string, purpose: AuthTokenPurpose): Promise<string | null> {
  const now = new Date();
  const row = await prisma.authToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.purpose !== purpose || row.usedAt || row.expiresAt <= now) return null;
  // Conditional update so two concurrent requests cannot both use the same token.
  const { count } = await prisma.authToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: now } });
  return count === 1 ? row.userId : null;
}
