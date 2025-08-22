import { Resend } from 'resend';

const resend = new Resend('re_NcWtx9J8_EPjE4YJhcvRRyjU2cqdiZ2WA');

export async function sendAuthEmail(email: string, otp: string, firstName: string): Promise<void> {
  // Always log for debugging
  console.log(`🔐 Authentication code for ${firstName} (${email}): ${otp}`);
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'Jews for Jesus <onboarding@resend.dev>',
      to: email,
      subject: 'Your Login Verification Code - Jews for Jesus',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; border: 1px solid #e0e0e0;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1e40af; margin: 0; font-size: 24px;">Jews for Jesus</h1>
              <p style="color: #666; margin: 5px 0 0 0;">Donation Management System</p>
            </div>
            
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${firstName},</h2>
            
            <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 25px;">
              You requested to log into the donation management system. Please use the verification code below:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #f0f4ff; border: 2px solid #1e40af; border-radius: 8px; padding: 20px; display: inline-block;">
                <span style="font-size: 32px; font-weight: bold; color: #1e40af; letter-spacing: 4px;">${otp}</span>
              </div>
            </div>
            
            <p style="color: #555; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
              This code will expire in <strong>10 minutes</strong>. If you didn't request this code, please ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              Jews for Jesus Donation Management System<br>
              This is an automated message, please do not reply.
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('❌ Resend email error:', error);
      throw new Error(`Email sending failed: ${error.message}`);
    }

    console.log('✅ Email sent successfully:', data?.id);
  } catch (error) {
    console.error('❌ Email service error:', error);
    throw error;
  }
}