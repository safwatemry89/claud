/** Per-device conveniences only (checkbox state for the current spike/day). Never clinical records. */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}
export const todayKey = () => new Date().toISOString().slice(0, 10);

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const isNative = Capacitor.isNativePlatform();

/** Stable 31-bit id from a string so rescheduling replaces rather than duplicates. */
function idFor(key: string): number {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

/** Schedule a notification that fires even if the app is backgrounded (Android only; web relies on the in-page timer). */
export function scheduleNotification(key: string, at: Date, title: string, body: string) {
  if (!isNative || at.getTime() <= Date.now()) return;
  void LocalNotifications.schedule({ notifications: [{ id: idFor(key), title, body, schedule: { at, allowWhileIdle: true } }] }).catch(() => {});
}

export function notify(title: string, body: string) {
  if (isNative) {
    void LocalNotifications.schedule({ notifications: [{ id: idFor(title + Date.now()), title, body }] }).catch(() => {});
    return;
  }
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'granted') new Notification(title, { body, requireInteraction: true });
}
export function requestNotificationPermission() {
  if (isNative) { void LocalNotifications.requestPermissions().catch(() => {}); return; }
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission();
}
