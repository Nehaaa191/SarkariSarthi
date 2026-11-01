import crypto from 'crypto';
import { OtpRecord } from '../types';

export class OtpStore {
  private store: Map<string, OtpRecord> = new Map();

  /**
   * Generates a 6-digit OTP and stores it for the given identifier.
   * Enforces a 60-second cooldown between resends and a maximum of 3 resends.
   */
  generateAndStore(identifier: string): string {
    const key = identifier.trim().toLowerCase();
    const now = Date.now();
    const existing = this.store.get(key);

    if (existing) {
      // Check if existing OTP is still active
      if (now <= existing.expiresAt) {
        // Enforce 60s cooldown
        const timeSinceLastResend = now - existing.lastResendAt;
        const cooldownMs = 60 * 1000;
        if (timeSinceLastResend < cooldownMs) {
          const waitSeconds = Math.ceil((cooldownMs - timeSinceLastResend) / 1000);
          throw new Error(`Please wait ${waitSeconds} second(s) before requesting another OTP`);
        }

        // Enforce max 3 resends
        if (existing.resendCount >= 3) {
          throw new Error('Maximum OTP resend limit reached. Please wait 10 minutes before trying again.');
        }

        // Generate 6-digit OTP using crypto.randomInt(100000, 1000000)
        // (crypto.randomInt max is exclusive, 1000000 generates 100000 to 999999 inclusive)
        const otp = crypto.randomInt(100000, 1000000).toString();
        existing.otp = otp;
        existing.expiresAt = now + 10 * 60 * 1000;
        existing.attempts = 0;
        existing.resendCount += 1;
        existing.lastResendAt = now;
        return otp;
      } else {
        // Expired OTP, clear and create fresh entry
        this.store.delete(key);
      }
    }

    // Generate 6-digit OTP using crypto.randomInt(100000, 999999)
    const otp = crypto.randomInt(100000, 1000000).toString();
    this.store.set(key, {
      otp,
      expiresAt: now + 10 * 60 * 1000,
      attempts: 0,
      resendCount: 0,
      lastResendAt: now,
    });

    return otp;
  }

  /**
   * Verifies the provided OTP for the given identifier.
   * Throws if expired, max attempts reached, or invalid OTP.
   * Deletes entry on successful verification.
   */
  verify(identifier: string, inputOtp: string): true {
    const key = identifier.trim().toLowerCase();
    const record = this.store.get(key);

    if (!record) {
      throw new Error('No active OTP found. Please request an OTP first.');
    }

    const now = Date.now();
    if (now > record.expiresAt) {
      this.store.delete(key);
      throw new Error('OTP has expired. Please request a new OTP.');
    }

    if (record.attempts >= 3) {
      this.store.delete(key);
      throw new Error('Maximum verification attempts exceeded. Please request a new OTP.');
    }

    record.attempts += 1;

    if (record.otp !== inputOtp.trim()) {
      const remaining = 3 - record.attempts;
      if (remaining <= 0) {
        this.store.delete(key);
        throw new Error('Invalid OTP. Maximum attempts reached. Please request a new OTP.');
      }
      throw new Error(`Invalid OTP. You have ${remaining} attempt(s) remaining.`);
    }

    // Success: remove entry from store
    this.store.delete(key);
    return true;
  }

  // Clear all OTPs (useful in tests)
  clear(): void {
    this.store.clear();
  }
}

export const otpService = new OtpStore();
