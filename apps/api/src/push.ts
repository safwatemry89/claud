import { prisma } from './db';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function sendPush(userId: string, title: string, body: string, priority: 'high' | 'default' = 'high') {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { pushToken: true } });
  if (!user?.pushToken) return false;
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ to: user.pushToken, title, body, priority, sound: 'default' }),
    });
    return res.ok;
  } catch (err) {
    console.error('push failed', err);
    return false;
  }
}

/**
 * In-process scheduler for the 60-minute recalibration push.
 * One timer per user: a newer spike replaces the pending timer.
 * NOTE: timers are lost on restart; for multi-instance deployments move this to a durable queue
 * (e.g. BullMQ/pg-boss). Clients also run a local countdown + local notification as a fallback.
 */
const timers = new Map<string, NodeJS.Timeout>();

export function schedulePush(userId: string, at: Date, title: string, body: string) {
  cancelScheduledPush(userId);
  const delay = Math.max(0, at.getTime() - Date.now());
  const t = setTimeout(() => {
    timers.delete(userId);
    void sendPush(userId, title, body);
  }, delay);
  t.unref();
  timers.set(userId, t);
}

export function cancelScheduledPush(userId: string) {
  const t = timers.get(userId);
  if (t) clearTimeout(t);
  timers.delete(userId);
}
