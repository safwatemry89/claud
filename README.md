# Metabolic-90

90-day low-carb, carb-cycling and digestive-recovery tracker. npm-workspaces monorepo:

| Package | What |
|---|---|
| `packages/core` | Pure TypeScript clinical logic shared by API and clients: glucose classification, Rescue/DKA triggers, eA1c/GMI/time-in-range/velocity analytics and day-90 projection, program day/phase/week cycle, Friday glycemic-sequence locking, hydration deficit, rituals, missed medication detection. Unit-tested. |
| `apps/api` | Express + Prisma/PostgreSQL REST API (JWT auth, zod validation, helmet, rate limiting, per-user scoping, Expo push for recalibration and DKA alerts). |
| `apps/web` | React/Vite web client implementing the three-zone UI. `core` has no DOM dependencies, so an Expo/React Native client can reuse it as-is. |

## Run locally
```bash
npm install
cp apps/api/.env.example apps/api/.env   # set DATABASE_URL, JWT_SECRET (>=32 chars)
cd apps/api && npx prisma migrate dev --name init
psql "$DATABASE_URL" -f prisma/constraints.sql   # CHECK constraints (or paste into the migration)
cd ../.. && npm run dev:api & npm run dev:web     # http://localhost:5173
npm test                                          # core logic tests
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
- Ritual check-offs and rescue checkboxes are stored per device; the schema has no table for them.
- `POST /auth/dev-login` is for development only (off in production). Swap in a real identity provider before deployment.
- The recalibration push timer is in-process. Use a durable queue (pg-boss/BullMQ) for multi-instance deployments.

Not a medical device.
