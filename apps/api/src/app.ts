import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { z } from 'zod';
import { requireAuth, signToken } from './auth';
import { config } from './config';
import { prisma } from './db';
import { dashboardRouter } from './routes/dashboard';
import { glucoseRouter } from './routes/glucose';
import { hydrationRouter } from './routes/hydration';
import { mealsRouter } from './routes/meals';
import { medicationsRouter } from './routes/medications';
import { symptomsRouter } from './routes/symptoms';
import { usersRouter } from './routes/users';

// Express 4 does not forward async rejections; patch Router so thrown errors reach the error handler.
function wrapAsync(router: express.Router) {
  for (const layer of router.stack as any[]) {
    for (const l of layer.route?.stack ?? []) {
      const fn = l.handle;
      l.handle = (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);
    }
  }
  return router;
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '32kb' }));
  app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }));

  app.get('/health', (_req, res) => res.json({ ok: true }));

  if (config.enableDevLogin) {
    // Development-only passwordless login. Replace with a real identity provider in production.
    app.post('/auth/dev-login', async (req, res, next) => {
      try {
        const { email, name } = z.object({ email: z.string().email(), name: z.string().max(100).optional() }).parse(req.body);
        const user = await prisma.user.upsert({ where: { email }, update: {}, create: { email, name } });
        res.json({ token: signToken(user.id), user });
      } catch (e) {
        next(e);
      }
    });
  }

  const api = express.Router();
  api.use(requireAuth);
  api.use('/dashboard', wrapAsync(dashboardRouter));
  api.use('/glucose', wrapAsync(glucoseRouter));
  api.use('/symptoms', wrapAsync(symptomsRouter));
  api.use('/hydration', wrapAsync(hydrationRouter));
  api.use('/meals', wrapAsync(mealsRouter));
  api.use('/medications', wrapAsync(medicationsRouter));
  api.use('/users', wrapAsync(usersRouter));
  app.use('/api', api);

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', issues: err.issues });
    if (err instanceof RangeError) return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  };
  app.use(onError);
  return app;
}
