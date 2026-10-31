import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { userStore } from '../services/userStore';
import { User, JwtUserPayload } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Authentication middleware that verifies JWT Bearer token and attaches user to request.
 * Returns 401 Unauthorized if token is missing, invalid, expired, or user does not exist.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authorization header missing or invalid format' });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ success: false, message: 'Token missing' });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    res.status(500).json({ success: false, message: 'Server configuration error: JWT_SECRET not configured' });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtUserPayload;

    if (!decoded || !decoded.userId) {
      res.status(401).json({ success: false, message: 'Invalid token payload' });
      return;
    }

    const user = userStore.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch (err: any) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};
