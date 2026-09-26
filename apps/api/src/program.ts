import { isProgramComplete, programDayNumber, weekCycle } from '@m90/core';
import { prisma } from './db';

/** Returns the user's program state, creating it on first use and syncing day/week counters. */
export async function syncProgramState(userId: string, now = new Date()) {
  const state = await prisma.programState.upsert({ where: { userId }, update: {}, create: { userId } });
  const day = programDayNumber(state.startDate, now);
  const week = weekCycle(day);
  const isActive = !isProgramComplete(state.startDate, now);
  if (day !== state.currentDayNumber || week !== state.currentWeekCycle || isActive !== state.isActive) {
    return prisma.programState.update({
      where: { userId },
      data: { currentDayNumber: day, currentWeekCycle: week, isActive },
    });
  }
  return state;
}
