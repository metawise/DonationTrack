// Email service for sending authentication codes
export async function sendAuthEmail(email: string, otp: string, firstName: string): Promise<void> {
  // In development, just log the OTP
  console.log(`🔐 Authentication code for ${firstName} (${email}): ${otp}`);
  
  // TODO: Implement actual email sending with Resend API
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // 
  // await resend.emails.send({
  //   from: 'Jews for Jesus <noreply@jewsforjesus.org>',
  //   to: email,
  //   subject: 'Your Login Verification Code',
  //   html: `
  //     <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  //       <h2>Hello ${firstName},</h2>
  //       <p>Your verification code is: <strong style="font-size: 24px; color: #1e40af;">${otp}</strong></p>
  //       <p>This code will expire in 10 minutes.</p>
  //       <p>If you didn't request this code, please ignore this email.</p>
  //       <hr>
  //       <p><small>Jews for Jesus Donation Management System</small></p>
  //     </div>
  //   `,
  // });
}