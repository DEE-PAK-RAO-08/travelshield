import { Router } from 'express';
import { body } from 'express-validator';
import { asyncHandler } from '../utils/helpers';
import { validate } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import * as authService from '../services/auth.service';

const router = Router();

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').trim().notEmpty().withMessage('First name required'),
    body('lastName').trim().notEmpty().withMessage('Last name required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  })
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body.email, req.body.password);
    res.json({ success: true, data: result });
  })
);

router.post(
  '/refresh',
  [body('refreshToken').notEmpty()],
  validate,
  asyncHandler(async (req, res) => {
    const tokens = await authService.refreshSession(req.body.refreshToken);
    res.json({ success: true, data: tokens });
  })
);

router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  const token = req.body.refreshToken;
  if (token) await authService.logout(token);
  res.json({ success: true, message: 'Logged out' });
}));

router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  validate,
  asyncHandler(async (req, res) => {
    const result = await authService.forgotPassword(req.body.email);
    res.json({ success: true, data: result });
  })
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty(),
    body('password').isLength({ min: 8 }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await authService.resetPassword(req.body.token, req.body.password);
    res.json({ success: true, data: result });
  })
);

router.post(
  '/verify-email',
  [body('token').notEmpty()],
  validate,
  asyncHandler(async (req, res) => {
    const result = await authService.verifyEmail(req.body.token);
    res.json({ success: true, data: result });
  })
);

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const prisma = (await import('../utils/prisma')).default;
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { profile: true, preferences: true },
  });
  res.json({ success: true, data: authService.sanitizeUser(user as Record<string, unknown>) });
}));

export default router;
