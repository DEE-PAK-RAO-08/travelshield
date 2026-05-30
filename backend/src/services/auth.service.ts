import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import { signAccessToken, signRefreshToken, parseExpiry } from '../utils/jwt';
import { config } from '../config';
import { AppError } from '../utils/helpers';
import { sendEmail, verificationEmailHtml, resetPasswordEmailHtml } from './email.service';

function generateTouristId() {
  return `TS-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) throw new AppError('Email already registered', 409);

  const passwordHash = await bcrypt.hash(data.password, 12);
  const verifyToken = uuidv4();

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      profile: {
        create: {
          touristId: generateTouristId(),
          nationality: 'USA',
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          blockchainHash: '0x' + (uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '')),
        },
      },
      preferences: { create: {} },
      emailVerifications: {
        create: {
          token: verifyToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      },
    },
    include: { profile: true },
  });

  await sendEmail(
    user.email,
    'Verify your TravelShield account',
    verificationEmailHtml(user.firstName, verifyToken)
  );

  const tokens = await createSession(user.id, user.email, user.role);
  return { user: sanitizeUser(user), ...tokens, verifyToken };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { profile: true, preferences: true },
  });

  if (!user || !user.isActive) throw new AppError('Invalid credentials', 401);
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError('Invalid credentials', 401);

  // Upgrade blockchain hash if missing or truncated
  if (user.profile && (!user.profile.blockchainHash || user.profile.blockchainHash.length < 66 || user.profile.blockchainHash.includes('...'))) {
    const fullHash = '0x' + (uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, ''));
    const updatedProfile = await prisma.userProfile.update({
      where: { id: user.profile.id },
      data: { blockchainHash: fullHash },
    });
    user.profile = updatedProfile;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const tokens = await createSession(user.id, user.email, user.role);
  return { user: sanitizeUser(user), ...tokens };
}

async function createSession(userId: string, email: string, role: string) {
  const payload = { userId, email, role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      userId,
      token: refreshToken,
      expiresAt: parseExpiry(config.jwt.refreshExpiry),
    },
  });

  return { accessToken, refreshToken };
}

export async function refreshSession(token: string) {
  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw new AppError('Invalid refresh token', 401);
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user || !user.isActive) throw new AppError('User not found', 401);

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
  return createSession(user.id, user.email, user.role);
}

export async function logout(token: string) {
  await prisma.refreshToken.updateMany({
    where: { token },
    data: { revoked: true },
  });
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return { message: 'If the email exists, a reset link has been sent' };

  const token = uuidv4();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  await sendEmail(user.email, 'Reset your password', resetPasswordEmailHtml(user.firstName, token));
  return { message: 'If the email exists, a reset link has been sent' };
}

export async function resetPassword(token: string, newPassword: string) {
  const reset = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!reset || reset.used || reset.expiresAt < new Date()) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: reset.id }, data: { used: true } }),
    prisma.refreshToken.updateMany({ where: { userId: reset.userId }, data: { revoked: true } }),
  ]);

  return { message: 'Password reset successful' };
}

export async function verifyEmail(token: string) {
  const verification = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!verification || verification.used || verification.expiresAt < new Date()) {
    throw new AppError('Invalid or expired verification token', 400);
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: verification.userId }, data: { isEmailVerified: true } }),
    prisma.emailVerificationToken.update({ where: { id: verification.id }, data: { used: true } }),
  ]);

  return { message: 'Email verified successfully' };
}

function sanitizeUser(user: Record<string, unknown>) {
  const { passwordHash, ...safe } = user;
  return safe;
}

export { sanitizeUser };
