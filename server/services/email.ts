import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_FCHtmZRs_BejUiuRkmnSnXszoSDyQz8JD';

if (!RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable must be set");
}

const resend = new Resend(RESEND_API_KEY);

export interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    const emailPayload: any = {
      from: params.from,
      to: [params.to],
      subject: params.subject,
    };

    if (params.html) {
      emailPayload.html = params.html;
    }
    if (params.text) {
      emailPayload.text = params.text;
    }

    await resend.emails.send(emailPayload);
    return true;
  } catch (error) {
    console.error('Resend email error:', error);
    return false;
  }
}

// Pre-built email templates
export async function sendAuthEmail(to: string, authCode: string): Promise<boolean> {
  return sendEmail({
    to,
    from: 'noreply@jewsforjesus.org',
    subject: 'Your Authentication Code - Jews for Jesus',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Jews for Jesus - Authentication</h2>
        <p>Your authentication code is: <strong style="font-size: 24px; color: #1e40af;">${authCode}</strong></p>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      </div>
    `,
    text: `Your Jews for Jesus authentication code is: ${authCode}. This code will expire in 10 minutes.`,
  });
}

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<boolean> {
  return sendEmail({
    to,
    from: 'noreply@jewsforjesus.org',
    subject: 'Reset Your Password - Jews for Jesus',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Jews for Jesus - Password Reset</h2>
        <p>You requested to reset your password. Click the link below to reset it:</p>
        <p><a href="${resetLink}" style="background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this reset, please ignore this email.</p>
      </div>
    `,
    text: `Reset your Jews for Jesus password: ${resetLink}. This link will expire in 1 hour.`,
  });
}