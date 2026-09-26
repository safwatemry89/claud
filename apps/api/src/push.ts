import { prisma } from './db';

const EXPO_PUSH_URL = process.env.EXPO_PUSH_URL ?? 'https://exp.host/--/api/v2/push/send';

export type PushResult = 'sent' | 'no-token' | 'failed';

export async function sendPush(userId: string, title: string, body: string, priority: 'high' | 'default' = 'high'): Promise<PushResult> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { pushToken: true } });
  if (!user?.pushToken) return 'no-token';
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ to: user.pushToken, title, body, priority, sound: 'default' }),
      signal: AbortSignal.timeout(10_000), // well under the queue's lease, so a slow send is never sent twice
    });
    return res.ok ? 'sent' : 'failed';
  } catch (err) {
    console.error('push failed', err);
    return 'failed';
  }
}

/**
 * Durable scheduler for the 60-minute recalibration push, stored in the ScheduledPush table so it
 * survives restarts and works with several API instances. One pending push per user: a newer spike
 * replaces it. Clients also run a local countdown and notification as a fallback.
 */
export async function schedulePush(userId: string, at: Date, title: string, body: string) {
  const job = { sendAt: at, title, body, attempts: 0, lockedUntil: null };
  await prisma.scheduledPush.upsert({ where: { userId }, update: job, create: { userId, ...job } });
}

export async function cancelScheduledPush(userId: string) {
  await prisma.scheduledPush.deleteMany({ where: { userId } });
}

const POLL_MS = Number(process.env.PUSH_POLL_MS ?? 15_000);
const LOCK_MS = 60_000;
const MAX_ATTEMPTS = 5;
/** A reminder this late (e.g. every instance was down) is no longer useful, so it is dropped. */
const MAX_LATENESS_MS = 30 * 60_000;
const BATCH = 20;

interface ClaimedPush { id: string; userId: string; sendAt: Date; title: string; body: string; attempts: number }

/**
 * Claims due pushes. SKIP LOCKED plus the lease keeps two instances from sending the same one.
 * Prisma stores DateTime as UTC `timestamp without time zone`, so compare against UTC, not the session's zone.
 */
function claimDuePushes(): Promise<ClaimedPush[]> {
  return prisma.$queryRaw<ClaimedPush[]>`
    UPDATE "ScheduledPush" SET "lockedUntil" = (now() AT TIME ZONE 'UTC') + ${LOCK_MS}::int * interval '1 millisecond'
    WHERE id IN (
      SELECT id FROM "ScheduledPush"
      WHERE "sendAt" <= (now() AT TIME ZONE 'UTC') AND ("lockedUntil" IS NULL OR "lockedUntil" < (now() AT TIME ZONE 'UTC'))
      ORDER BY "sendAt" LIMIT ${BATCH}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, "userId", "sendAt", title, body, attempts`;
}

async function deliver(job: ClaimedPush) {
  // Match sendAt too: if a newer spike rescheduled this user's push while we were sending, keep the new one.
  const done = () => prisma.scheduledPush.deleteMany({ where: { id: job.id, sendAt: job.sendAt } });
  if (Date.now() - job.sendAt.getTime() > MAX_LATENESS_MS) return done();

  const result = await sendPush(job.userId, job.title, job.body);
  if (result !== 'failed' || job.attempts + 1 >= MAX_ATTEMPTS) return done();

  const retryAt = new Date(Date.now() + 2 ** job.attempts * 10_000); // 10s, 20s, 40s, 80s
  await prisma.scheduledPush.updateMany({
    where: { id: job.id, sendAt: job.sendAt },
    data: { attempts: { increment: 1 }, lockedUntil: retryAt },
  });
}

export async function runPushQueueOnce() {
  const jobs = await claimDuePushes();
  await Promise.all(jobs.map((j) => deliver(j).catch((err) => console.error('push delivery failed', err))));
  return jobs.length;
}

export function startPushWorker() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      while ((await runPushQueueOnce()) === BATCH);
    } catch (err) {
      console.error('push queue poll failed', err);
    } finally {
      running = false;
    }
  };
  void tick();
  return setInterval(tick, POLL_MS);
}
