import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { userStore } from '../services/userStore';
import { otpService } from '../services/otp';
import { sendOtpEmail } from '../services/mailer';
import { sendOtpSms } from '../services/sms';
import { requireAuth } from '../middleware/authMiddleware';
import { User, IdentifierType } from '../types';

const router = Router();

// Strict rate limiters per requirements
const sendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP requests. Please try again after 15 minutes.' },
});

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many verification attempts. Please try again after 15 minutes.' },
});

// Helper: Parse and validate identifier (email or Indian mobile number)
function parseIdentifier(input: string): { type: IdentifierType; normalized: string } | null {
  const trimmed = input.trim();

  // Validate Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(trimmed)) {
    return { type: 'email', normalized: trimmed.toLowerCase() };
  }

  // Validate Indian Mobile Phone Number
  // Strips whitespaces, dashes, and parentheses
  const cleaned = trimmed.replace(/[\s\-\(\)]/g, '');
  // Matches 10-digit number with optional +91, 91, or 0 prefix
  const phoneRegex = /^(?:\+91|91|0)?(\d{10})$/;
  const match = cleaned.match(phoneRegex);
  if (match) {
    const tenDigits = match[1];
    return { type: 'phone', normalized: `+91${tenDigits}` };
  }

  return null;
}

// Cookie helper
const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

// Token helper
function generateTokens(userId: string): { accessToken: string; refreshToken: string } {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!jwtSecret || !jwtRefreshSecret) {
    throw new Error('JWT secrets are not configured in environment variables');
  }

  const accessToken = jwt.sign({ userId }, jwtSecret, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, jwtRefreshSecret, { expiresIn: '7d' });

  return { accessToken, refreshToken };
}

// User serialization helper to sanitize output
function sanitizeUser(user: User): User {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    avatar: user.avatar,
  };
}

/**
 * POST /auth/send-otp
 * Body: { identifier: string }
 * Response: { success: true, message: string, type: 'email'|'phone' }
 * Error: { success: false, message: string }
 */
router.post('/send-otp', sendOtpLimiter, async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;

    if (!identifier || typeof identifier !== 'string') {
      res.status(400).json({ success: false, message: 'Identifier is required' });
      return;
    }

    const parsed = parseIdentifier(identifier);
    if (!parsed) {
      res.status(400).json({
        success: false,
        message: 'Invalid identifier. Please provide a valid email or 10-digit Indian mobile number.',
      });
      return;
    }

    const { type, normalized } = parsed;
    const otp = otpService.generateAndStore(normalized);

    if (type === 'email') {
      await sendOtpEmail(normalized, otp);
    } else {
      await sendOtpSms(normalized, otp);
    }

    res.json({
      success: true,
      message: `OTP sent successfully to your ${type === 'email' ? 'email' : 'phone'}`,
      type,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to send OTP',
    });
  }
});

/**
 * POST /auth/verify-otp
 * Body: { identifier: string, otp: string }
 * Response: { success: true, accessToken: string, user: User }
 * Sets httpOnly cookie: refreshToken (7 days)
 * Error: { success: false, message: string }
 */
router.post('/verify-otp', verifyOtpLimiter, async (req: Request, res: Response) => {
  try {
    const { identifier, otp } = req.body;

    if (!identifier || typeof identifier !== 'string') {
      res.status(400).json({ success: false, message: 'Identifier is required' });
      return;
    }

    if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())) {
      res.status(400).json({ success: false, message: 'OTP must be exactly 6 digits' });
      return;
    }

    const parsed = parseIdentifier(identifier);
    if (!parsed) {
      res.status(400).json({
        success: false,
        message: 'Invalid identifier. Please provide a valid email or 10-digit Indian mobile number.',
      });
      return;
    }

    const { type, normalized } = parsed;

    // Verify OTP (throws descriptive errors if invalid, expired, or attempts exceeded)
    otpService.verify(normalized, otp.trim());

    // Find or create user
    let user: User | undefined;
    if (type === 'email') {
      user = userStore.findByEmail(normalized);
      if (!user) {
        user = userStore.create({ email: normalized });
      }
    } else {
      user = userStore.findByPhone(normalized);
      if (!user) {
        user = userStore.create({ phone: normalized });
      }
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    // Set refreshToken cookie
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      success: true,
      accessToken,
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || 'Verification failed',
    });
  }
});

/**
 * GET /auth/google
 * Redirects to Google OAuth consent screen
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

/**
 * GET /auth/google/callback
 * Handled by Passport
 * On success: sets refresh cookie, redirects to FRONTEND_URL/auth/callback
 * On failure: redirects to FRONTEND_URL/signin?error=google_failed
 */
router.get(
  '/google/callback',
  (req: Request, res: Response, next) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${frontendUrl}/signin?error=google_failed`,
    })(req, res, next);
  },
  (req: Request, res: Response) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    const user = req.user as User | undefined;

    if (!user) {
      res.redirect(`${frontendUrl}/signin?error=google_failed`);
      return;
    }

    const { refreshToken } = generateTokens(user.id);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
    res.redirect(`${frontendUrl}/auth/callback`);
  }
);

/**
 * POST /auth/refresh
 * Reads refreshToken cookie
 * Response: { success: true, accessToken: string, user: User }
 * Error 401: { success: false, message: 'No refresh token' }
 */
router.post('/refresh', (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  if (!refreshToken) {
    res.status(401).json({ success: false, message: 'No refresh token' });
    return;
  }

  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtRefreshSecret || !jwtSecret) {
    res.status(500).json({ success: false, message: 'Server configuration error' });
    return;
  }

  try {
    const decoded = jwt.verify(refreshToken, jwtRefreshSecret) as { userId: string };
    if (!decoded || !decoded.userId) {
      res.status(401).json({ success: false, message: 'Invalid refresh token' });
      return;
    }

    const user = userStore.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    const accessToken = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '15m' });

    res.json({
      success: true,
      accessToken,
      user: sanitizeUser(user),
    });
  } catch (err: any) {
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
});

/**
 * POST /auth/logout
 * Clears refreshToken cookie
 * Response: { success: true }
 */
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
  res.json({ success: true });
});

/**
 * GET /auth/me
 * Header: Authorization: Bearer <accessToken>
 * Response: { success: true, user: User }
 * Error 401 if invalid token
 */
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = req.user as User | undefined;
  if (!user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  res.json({
    success: true,
    user: sanitizeUser(user),
  });
});

export default router;
