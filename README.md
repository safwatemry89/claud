# Metabolic-90

90-day low-carb, carb-cycling and digestive-recovery tracker. npm-workspaces monorepo:

| Package | What |
|---|---|
| `packages/core` | Pure TypeScript clinical logic shared by API and clients: glucose classification, Rescue/DKA triggers, eA1c/GMI/time-in-range/velocity analytics and day-90 projection, program day/phase/week cycle, Friday glycemic-sequence locking, hydration deficit, rituals, missed medication detection. Unit-tested. |
| `apps/api` | Express + Prisma/PostgreSQL REST API (email + password sign-in with scrypt hashes, JWT sessions, zod validation, helmet, rate limiting, per-user scoping, Expo push for DKA alerts and a Postgres-backed queue for recalibration reminders). |
| `apps/web` | React/Vite web client implementing the three-zone UI. `core` has no DOM dependencies, so an Expo/React Native client can reuse it as-is. |

## Run locally
```bash
npm install
cp apps/api/.env.example apps/api/.env   # set DATABASE_URL, JWT_SECRET (>=32 chars)
cd apps/api && npx prisma migrate dev --name init
psql "$DATABASE_URL" -f prisma/constraints.sql   # CHECK constraints (or paste into the migration)
cd ../.. && npm run dev:api & npm run dev:web     # http://localhost:5173
npm test                                          # core logic and API unit tests
```

## Clinical rules (in `packages/core`)
- **Zones:** fasting/before-meal <100 / 100–125 / ≥126; after-meal/random <140 / 140–199 / ≥200.
- **DKA overlay:** latest reading ≥250, or ≥200 with nausea, abdominal pain, shortness of breath or lethargy (attached to the reading, or logged within 2 h after it). Takes priority over the Rescue banner.
- **200+ Rescue Protocol:** ≥200 with no emergency flags. The server sends a push after 60 minutes, and the client runs a local countdown and notification as a fallback.
- **eA1c:** ADAG `(mean + 46.7) / 28.7`; GMI `3.31 + 0.02392 × mean`; 14-day window.

## Assumptions (the spec left these open)
- Phases: days 1–30 Zero-Carb Adaptation, 31–60 Carb-Cycling Stabilization, 61–90 Metabolic Consolidation.
- Accepted glucose range 20–600 mg/dL. Doses count as missed 60 min after their scheduled time.
- Hydration pace is spread linearly from 07:00 to 22:00.
- Ritual check-offs, meal times and rescue checkboxes are saved on the server (`RitualLog` per local calendar day, `RescueCheck` per spike reading), with a copy on the device so they still show offline. A change made offline is not retried.
- Accounts use email + password (`POST /auth/register`, `POST /auth/login`). Passwords need at least 10 characters and are stored as scrypt hashes. Failed attempts are limited to 10 per IP per 15 minutes. Forgot-password emails a single-use reset link (1 hour) that also signs out every other session; registering emails a confirmation link (24 hours). Only SHA-256 hashes of link tokens are stored. Email confirmation is not required to use the app, which shows a reminder banner until it is done. Emailing endpoints are limited to 5 requests per IP per hour.
- `POST /auth/dev-login` (passwordless) exists only when `ENABLE_DEV_LOGIN=true` outside production. Accounts it creates have no password and cannot use `/auth/login`.
- The 60-minute recalibration push is queued in Postgres (`ScheduledPush`), so it survives restarts and runs safely on several API instances (rows are claimed with `FOR UPDATE SKIP LOCKED`). Each instance polls every 15 s (`PUSH_POLL_MS`). Failed sends retry up to 5 times, and a reminder more than 30 minutes late is dropped.

Not a medical device.

## Android APK
The web client is wrapped with Capacitor (`apps/web/android`, app id `com.metabolic90.app`).
- **CI:** the `Android APK` workflow builds a debug APK on every push that touches the client, and uploads it as the `metabolic-90-debug-apk` artifact. Run it manually with an `api_url` input to set a default server URL in the build.
- **Locally** (requires the Android SDK): `npm run android:apk -w @m90/web`.
- The phone must be able to reach the API over HTTPS. Enter the server URL on the sign-in screen, and include `https://localhost` in the API's `CORS_ORIGIN`.
- The 60-minute recalibration reminder is scheduled as a native local notification, so it fires even when the app is in the background.
