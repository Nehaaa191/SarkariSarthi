import nodemailer from 'nodemailer';

/**
 * Sends a beautifully branded OTP verification email using Gmail SMTP.
 * Falls back to logging to console in development if credentials are placeholder or missing.
 */
export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  // Development fallback when Gmail credentials are not configured
  if (!user || !pass || user.includes('placeholder') || pass.includes('placeholder')) {
    console.log('\n========================================');
    console.log(`[DEV MODE - MAILER] OTP for ${to}: ${otp}`);
    console.log(`Subject: Your SarkariSaathi Verification Code: ${otp}`);
    console.log('========================================\n');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });

  const subject = `Your SarkariSaathi Verification Code: ${otp}`;

  const text = `Your SarkariSaathi Verification Code: ${otp}

Use this verification code to complete your login to SarkariSaathi:

${otp}

This code expires in 10 minutes.
If you didn't request this, ignore this email.

--
SarkariSaathi - Your Trusted Government Scheme Navigator`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SarkariSaathi Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f6f9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <!-- Header -->
          <tr>
            <td style="background-color: #1B2060; padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: 0.5px;">
                सरकारी<span style="color: #F5C518;">Saathi</span>
              </h1>
              <p style="margin: 6px 0 0; color: #cbd5e1; font-size: 13px; font-weight: 400;">Your Trusted Government Scheme Navigator</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 36px 32px; text-align: center;">
              <h2 style="margin: 0 0 12px; color: #1B2060; font-size: 20px; font-weight: 600;">Verification Code</h2>
              <p style="margin: 0 0 24px; color: #475569; font-size: 15px; line-height: 1.5;">
                Please use the verification code below to sign in to your SarkariSaathi account.
              </p>

              <!-- OTP Code Box -->
              <div style="background-color: #f8fafc; border: 2px dashed #1B2060; border-radius: 10px; padding: 18px 24px; display: inline-block; margin: 0 auto 24px;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #1B2060; padding-left: 10px;">
                  ${otp}
                </span>
              </div>

              <!-- Expiry & Warning -->
              <p style="margin: 0 0 8px; color: #dc2626; font-size: 14px; font-weight: 500;">
                &#9201; This code expires in 10 minutes
              </p>
              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.4;">
                If you didn't request this, ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                &copy; ${new Date().getFullYear()} SarkariSaathi. All rights reserved.<br>
                Empowering citizens with easy access to government welfare schemes.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"SarkariSaathi" <${user}>`,
    to,
    subject,
    text,
    html,
  });
}
