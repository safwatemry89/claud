import type { AlertLevel, GlucoseContext, GlucoseStatus, GlycemicSummary, A1cProjection, HydrationStatus } from '@m90/core';

const TOKEN_KEY = 'm90.token';
const API_URL_KEY = 'm90.apiUrl';

/** Server base URL. Empty means same origin (web dev via the Vite proxy); the Android app needs a full URL. */
export function getApiUrl(): string {
  try { return localStorage.getItem(API_URL_KEY) ?? import.meta.env.VITE_API_URL ?? ''; } catch { return import.meta.env.VITE_API_URL ?? ''; }
}
export function setApiUrl(url: string) {
  try { localStorage.setItem(API_URL_KEY, url.trim().replace(/\/+$/, '')); } catch { /* ignore */ }
}

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token: string | null) {
  try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(getApiUrl() + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) setToken(null);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.error ?? res.statusText);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export interface SymptomInput {
  continuousBurping?: boolean; bloating?: boolean; nausea?: boolean; abdominalPain?: boolean;
  extremeLethargy?: boolean; shortnessOfBreath?: boolean; severityScore?: number;
}

export interface GlucoseLog {
  id: string; valueMgPerDl: number; measuredAt: string; context: GlucoseContext; status: GlucoseStatus; notes?: string | null;
}

export interface Dashboard {
  program: { currentDayNumber: number; currentWeekCycle: number; phase: string; greeting: string; isCarbCycleDay: boolean; isActive: boolean };
  latest: GlucoseLog | null;
  alert: AlertLevel;
  recalibrateAt: string | null;
  analytics: GlycemicSummary & { projection: A1cProjection };
  hydration: HydrationStatus;
}

export interface MealLog { fiberConsumedFirst: boolean; proteinConsumedSecond: boolean; carbsConsumedLast: boolean; isCompliant: boolean }
export interface MedicationDose { id: string; medName: string; doseTaken: string; scheduledTime: string; takenAt: string; isMissed: boolean }

export interface RitualDay {
  date: string; okraTakenAt: string | null; cinnamonDone: boolean; greenTeaDone: boolean; nextMealTime: string | null; lastMealTime: string | null;
}
export interface RescueChecklist { hydration: boolean; walking: boolean; posture: boolean }

export const api = {
  login: (email: string, password: string) => request<{ token: string }>('POST', '/auth/login', { email, password }),
  register: (email: string, password: string, name?: string) =>
    request<{ token: string }>('POST', '/auth/register', { email, password, name }),
  forgotPassword: (email: string) => request<{ message: string }>('POST', '/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => request<{ token: string }>('POST', '/auth/reset-password', { token, password }),
  verifyEmail: (token: string) => request<{ verified: boolean }>('POST', '/auth/verify-email', { token }),
  me: () => request<{ id: string; email: string; name: string | null; emailVerifiedAt: string | null }>('GET', '/api/users/me'),
  resendVerification: () => request<{ message: string }>('POST', '/api/users/me/verify-email'),
  dashboard: () => request<Dashboard>('GET', '/api/dashboard'),
  glucose: (days = 14) => request<GlucoseLog[]>('GET', `/api/glucose?days=${days}`),
  logGlucose: (body: { valueMgPerDl: number; context: GlucoseContext; notes?: string; symptoms?: SymptomInput }) =>
    request<{ alert: AlertLevel; recalibrateAt: string | null; missedDoses: { medName: string; scheduledTime: string }[] }>('POST', '/api/glucose', body),
  logSymptoms: (body: SymptomInput) => request<{ alert: AlertLevel }>('POST', '/api/symptoms', body),
  addCup: () => request<HydrationStatus>('POST', '/api/hydration', {}),
  removeCup: () => request<HydrationStatus>('DELETE', '/api/hydration/last'),
  mealToday: () => request<{ isCarbCycleDay: boolean; meal: MealLog | null }>('GET', '/api/meals/today'),
  toggleMeal: (step: string, checked: boolean) =>
    request<{ isCarbCycleDay: boolean; meal: MealLog }>('PUT', '/api/meals/today', { step, checked }),
  medsToday: () => request<{ doses: MedicationDose[]; adherencePercent: number | null }>('GET', '/api/medications/today'),
  addMed: (body: { medName: string; doseTaken: string; scheduledTime: string; isMissed?: boolean }) =>
    request<MedicationDose>('POST', '/api/medications', body),
  markMed: (id: string, isMissed: boolean) => request<MedicationDose>('PATCH', `/api/medications/${id}`, { isMissed }),
  rituals: (date: string) => request<RitualDay>('GET', `/api/rituals/${date}`),
  updateRituals: (date: string, body: Partial<Omit<RitualDay, 'date'>>) => request<RitualDay>('PUT', `/api/rituals/${date}`, body),
  rescue: (glucoseLogId: string) => request<RescueChecklist>('GET', `/api/rescue/${glucoseLogId}`),
  updateRescue: (glucoseLogId: string, body: Partial<RescueChecklist>) =>
    request<RescueChecklist>('PUT', `/api/rescue/${glucoseLogId}`, body),
};
