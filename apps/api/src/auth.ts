import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { prisma } from './db';

export interface AuthedRequest extends Request<any> {
  userId: string;
}

/** `ver` is the user's tokenVersion; bumping it (on password reset) invalidates every earlier token. */
export function signToken(userId: string, tokenVersion: number): string {
  return jwt.sign({ sub: userId, ver: tokenVersion }, config.jwtSecret, { algorithm: 'HS256', expiresIn: '7d' });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing bearer token' });
  let userId: string;
  let ver: number;
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret, { algorithms: ['HS256'] });
    if (typeof payload !== 'object' || typeof payload.sub !== 'string') throw new Error('bad token');
    userId = payload.sub;
    ver = typeof payload.ver === 'number' ? payload.ver : 0; // tokens issued before versioning count as version 0
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { tokenVersion: true } });
    if (!user || user.tokenVersion !== ver) return res.status(401).json({ error: 'Session has ended, please sign in again' });
    (req as AuthedRequest).userId = userId;
    next();
  } catch (err) {
    next(err);
  }
}
