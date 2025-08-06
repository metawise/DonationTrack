// Dummy email service that simulates sending verification codes
// In production, this would integrate with SendGrid or another email service

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export class DummyEmailService {
  private sentEmails: Map<string, EmailParams[]> = new Map();

  async sendEmail(params: EmailParams): Promise<boolean> {
    try {
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Store the "sent" email for debugging purposes
      const existing = this.sentEmails.get(params.to) || [];
      existing.push(params);
      this.sentEmails.set(params.to, existing);
      
      // Log the email for development (in production, this would actually send)
      console.log(`📧 [DUMMY EMAIL] Sent to ${params.to}:`);
      console.log(`   Subject: ${params.subject}`);
      console.log(`   Content: ${params.text || params.html}`);
      
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  async sendVerificationCode(email: string, code: string): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: 'Jews for Jesus - Login Verification Code',
      text: `Your verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Jews for Jesus</h1>
            <p style="margin: 5px 0 0 0;">Donation Management System</p>
          </div>
          <div style="padding: 30px; background: #f8fafc;">
            <h2 style="color: #1e40af; margin-top: 0;">Login Verification Code</h2>
            <p>Your verification code is:</p>
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; border: 2px solid #e2e8f0;">
              <h1 style="font-size: 32px; margin: 0; color: #1e40af; letter-spacing: 4px;">${code}</h1>
            </div>
            <p style="margin-top: 20px; color: #64748b; font-size: 14px;">
              This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
            </p>
          </div>
          <div style="background: #e2e8f0; padding: 15px; text-align: center; color: #64748b; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Jews for Jesus. All rights reserved.</p>
          </div>
        </div>
      `
    });
  }

  // Utility method for testing - get all emails sent to an address
  getEmailsFor(email: string): EmailParams[] {
    return this.sentEmails.get(email) || [];
  }

  // Utility method for testing - clear all sent emails
  clearSentEmails(): void {
    this.sentEmails.clear();
  }
}

export const emailService = new DummyEmailService();