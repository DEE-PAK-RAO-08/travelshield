import nodemailer from 'nodemailer';
import { config } from '../config';
import logger from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: false,
  auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
});

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    if (!config.smtp.user) {
      logger.info(`[Email Mock] To: ${to} | Subject: ${subject}`);
      return;
    }
    await transporter.sendMail({ from: config.smtp.from, to, subject, html });
  } catch (error) {
    logger.error('Email send failed:', error);
  }
}

export function verificationEmailHtml(name: string, token: string) {
  const url = `${config.frontendUrl}/verify-email?token=${token}`;
  return `<h2>Welcome to TravelShield, ${name}!</h2><p>Verify your email: <a href="${url}">${url}</a></p>`;
}

export function resetPasswordEmailHtml(name: string, token: string) {
  const url = `${config.frontendUrl}/reset-password?token=${token}`;
  return `<h2>Password Reset - TravelShield</h2><p>Hi ${name}, reset your password: <a href="${url}">${url}</a></p><p>Link expires in 1 hour.</p>`;
}
