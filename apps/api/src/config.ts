function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: required('JWT_SECRET'),
  // Comma-separated. The Android app's WebView origin is https://localhost.
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173,https://localhost').split(',').map((s) => s.trim()),
  // Web app address used in emailed links, e.g. https://app.example.com
  appUrl: (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/+$/, ''),
  // e.g. smtps://user:pass@smtp.example.com:465. Unset: links are printed to the console (development only).
  smtpUrl: process.env.SMTP_URL,
  mailFrom: process.env.MAIL_FROM ?? 'Metabolic-90 <no-reply@localhost>',
  isProduction: process.env.NODE_ENV === 'production',
  enableDevLogin: process.env.ENABLE_DEV_LOGIN === 'true' && process.env.NODE_ENV !== 'production',
};

if (config.jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
