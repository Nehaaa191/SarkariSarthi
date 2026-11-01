import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import passport from 'passport';
import { userStore } from '../services/userStore';
import { otpService } from '../services/otp';
import { sendOtpEmail } from '../services/mailer';
import { requireAuth } from '../middleware/authMiddleware';
import { User } from '../types';

const router = Router();

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------

const sendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP requests. Please try again after 15 minutes.' },
});

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many verification attempts. Please try again after 15 minutes.' },
});

// ---------------------------------------------------------------------------
// Cookie config
// ---------------------------------------------------------------------------

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

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

function sanitizeUser(user: User): Omit<User, 'googleId'> {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
  };
}

// ---------------------------------------------------------------------------
// In-memory one-time token store for the Google OAuth handoff.
//
// After Google redirects back to the backend, the backend cannot set a cookie
// that the frontend (on a different port in dev) will receive automatically.
// Instead, we generate a short-lived, single-use opaque token, append it to
// the redirect URL as a query param, and the frontend exchanges it for a
// proper httpOnly refresh cookie via POST /auth/exchange-token.
//
// Tokens expire after 60 seconds and are deleted after first use.
// ---------------------------------------------------------------------------

interface OauthHandoffRecord {
  userId: string;
  expiresAt: number;
}

const oauthHandoffStore = new Map<string, OauthHandoffRecord>();

function createOauthHandoffToken(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  oauthHandoffStore.set(token, {
    userId,
    expiresAt: Date.now() + 60 * 1000, // 60 second TTL
  });
  return token;
}

function consumeOauthHandoffToken(token: string): string | null {
  const record = oauthHandoffStore.get(token);
  oauthHandoffStore.delete(token); // always delete — single use
  if (!record || Date.now() > record.expiresAt) {
    return null;
  }
  return record.userId;
}

// ---------------------------------------------------------------------------
// Email OTP — POST /auth/send-otp
// ---------------------------------------------------------------------------

/**
 * POST /auth/send-otp
 * Body: { identifier: string }  — must be a valid email address
 * Response: { success: true, message: string }
 */
router.post('/send-otp', sendOtpLimiter, async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;

    if (!identifier || typeof identifier !== 'string') {
      res.status(400).json({ success: false, message: 'Email address is required' });
      return;
    }

    const email = identifier.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: 'Invalid email address. Please enter a valid email.',
      });
      return;
    }

    const otp = otpService.generateAndStore(email);
    await sendOtpEmail(email, otp);

    res.json({
      success: true,
      message: 'OTP sent successfully to your email',
      type: 'email',
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to send OTP',
    });
  }
});

// ---------------------------------------------------------------------------
// Email OTP — POST /auth/verify-otp
// ---------------------------------------------------------------------------

/**
 * POST /auth/verify-otp
 * Body: { identifier: string, otp: string }
 * Response: { success: true, accessToken: string, user: User }
 * Sets httpOnly cookie: refreshToken (7 days)
 */
router.post('/verify-otp', verifyOtpLimiter, async (req: Request, res: Response) => {
  try {
    const { identifier, otp } = req.body;

    if (!identifier || typeof identifier !== 'string') {
      res.status(400).json({ success: false, message: 'Email address is required' });
      return;
    }

    if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())) {
      res.status(400).json({ success: false, message: 'OTP must be exactly 6 digits' });
      return;
    }

    const email = identifier.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: 'Invalid email address.',
      });
      return;
    }

    // Verify OTP (throws on invalid / expired / max-attempts)
    otpService.verify(email, otp.trim());

    // Find or create user
    let user = userStore.findByEmail(email);
    if (!user) {
      user = userStore.create({ email });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
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

// ---------------------------------------------------------------------------
// Google OAuth — GET /auth/google
// ---------------------------------------------------------------------------

/**
 * GET /auth/google
 * Redirects to Google's OAuth consent screen.
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

// ---------------------------------------------------------------------------
// Google OAuth — GET /auth/google/callback
// ---------------------------------------------------------------------------

/**
 * GET /auth/google/callback
 *
 * Google redirects here after the user consents.
 *
 * IMPORTANT — why we use a one-time handoff token instead of a cookie:
 * In development the backend (port 3001) and frontend (port 5174) are on
 * different origins. The browser follows the Google redirect directly to
 * localhost:3001 (not through the Vite proxy), so any cookie set here is
 * scoped to localhost:3001 and never sent to localhost:5174.
 *
 * Solution: generate a short-lived (60s), single-use opaque token, append it
 * to the redirect URL, and let AuthCallback call POST /auth/exchange-token to
 * swap it for a proper httpOnly refresh cookie + access token.
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

    // Create one-time handoff token (60s TTL, single-use)
    const handoffToken = createOauthHandoffToken(user.id);

    // Redirect to frontend with the opaque token in the URL.
    // Use /oauth/callback (not /auth/callback) so Vite's /auth proxy rule
    // doesn't intercept this frontend page navigation.
    res.redirect(`${frontendUrl}/oauth/callback?token=${handoffToken}`);
  }
);

// ---------------------------------------------------------------------------
// Google OAuth — POST /auth/exchange-token
// ---------------------------------------------------------------------------

/**
 * POST /auth/exchange-token
 * Body: { token: string }  — the opaque one-time token from the OAuth redirect
 *
 * Validates and consumes the handoff token, then:
 *   - Sets httpOnly refreshToken cookie
 *   - Returns { success: true, accessToken, user }
 *
 * Token expires after 60 seconds and is deleted on first use.
 */
router.post('/exchange-token', (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token || typeof token !== 'string') {
    res.status(400).json({ success: false, message: 'Token is required' });
    return;
  }

  const userId = consumeOauthHandoffToken(token.trim());
  if (!userId) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
    return;
  }

  const user = userStore.findById(userId);
  if (!user) {
    res.status(401).json({ success: false, message: 'User not found' });
    return;
  }

  const { accessToken, refreshToken } = generateTokens(user.id);

  // Cookie is now set on the same origin the frontend uses (via the Vite proxy)
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);

  res.json({
    success: true,
    accessToken,
    user: sanitizeUser(user),
  });
});

// ---------------------------------------------------------------------------
// POST /auth/refresh
// ---------------------------------------------------------------------------

/**
 * POST /auth/refresh
 * Reads httpOnly refreshToken cookie, returns a new access token + user.
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
    if (!decoded?.userId) {
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
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
});

// ---------------------------------------------------------------------------
// POST /auth/logout
// ---------------------------------------------------------------------------

/**
 * POST /auth/logout
 * Clears the httpOnly refreshToken cookie.
 */
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// GET /auth/me
// ---------------------------------------------------------------------------

/**
 * GET /auth/me
 * Requires Authorization: Bearer <accessToken>
 * Returns { success: true, user }
 */
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = req.user as User | undefined;
  if (!user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  res.json({ success: true, user: sanitizeUser(user) });
});

export default router;
