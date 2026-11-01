export interface User {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  googleId?: string;
  createdAt?: string;
}

export interface OtpRecord {
  otp: string;
  expiresAt: number;
  attempts: number;
  resendCount: number;
  lastResendAt: number;
}

export interface JwtUserPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

// Only email OTP is supported — phone/SMS has been removed
export type IdentifierType = 'email';
