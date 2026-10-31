import twilio from 'twilio';

/**
 * Sends OTP SMS via Twilio.
 *
 * IMPORTANT: Handle the case where Twilio credentials are not set — if TWILIO_ACCOUNT_SID
 * is empty or undefined, log the OTP to the console and do NOT throw (so development
 * works smoothly without requiring active Twilio credentials).
 */
export async function sendOtpSms(to: string, otp: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  const message = `Your SarkariSaathi verification code is: ${otp}. Valid for 10 minutes. Do not share.`;

  // Check if Twilio credentials are missing or placeholder
  if (
    !accountSid ||
    accountSid.trim() === '' ||
    accountSid.includes('placeholder') ||
    !authToken ||
    !fromNumber
  ) {
    console.log('\n========================================');
    console.log(`[DEV MODE - SMS] OTP for ${to}: ${otp}`);
    console.log(`Message: "${message}"`);
    console.log('========================================\n');
    return;
  }

  const client = twilio(accountSid, authToken);
  await client.messages.create({
    body: message,
    from: fromNumber,
    to,
  });
}
