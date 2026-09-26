function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: required('JWT_SECRET'),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  enableDevLogin: process.env.ENABLE_DEV_LOGIN === 'true' && process.env.NODE_ENV !== 'production',
};

if (config.jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
