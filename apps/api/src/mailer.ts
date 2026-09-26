import nodemailer from 'nodemailer';
import { config } from './config';

const transport = config.smtpUrl ? nodemailer.createTransport(config.smtpUrl) : null;

export async function sendMail(to: string, subject: string, text: string) {
  if (transport) {
    await transport.sendMail({ from: config.mailFrom, to, subject, text });
  } else if (config.isProduction) {
    // Never print account links to production logs.
    console.error(`SMTP_URL is not set; could not send "${subject}" email`);
  } else {
    console.log(`[mail to ${to}] ${subject}\n${text}`);
  }
}
