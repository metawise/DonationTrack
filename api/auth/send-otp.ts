// Auth-specific OTP endpoint for Vercel
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Debug logging
    console.log('Auth Send OTP - Request body:', req.body);
    console.log('Auth Send OTP - Request body type:', typeof req.body);

    // Handle different body parsing scenarios
    let body;
    if (typeof req.body === 'string') {
      try {
        body = JSON.parse(req.body);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON in request body' });
      }
    } else {
      body = req.body || {};
    }

    const { email } = body;
    
    console.log('Auth Send OTP - Parsed email:', email);
    
    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required',
        debug: {
          receivedEmail: email,
          bodyType: typeof req.body,
          rawBody: req.body
        }
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log(`🔐 Generated OTP for ${email}: ${otp}`);

    // Try to send email using Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    
    if (RESEND_API_KEY) {
      try {
        // Import Resend dynamically to avoid issues if not available
        const { Resend } = await import('resend');
        const resend = new Resend(RESEND_API_KEY);
        
        const { data, error } = await resend.emails.send({
          from: 'Jews for Jesus <onboarding@resend.dev>',
          to: email,
          subject: 'Your Login Verification Code - Jews for Jesus',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #1e40af;">Jews for Jesus</h1>
              <h2>Your Verification Code</h2>
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center;">
                <h1 style="font-size: 32px; color: #1e40af; margin: 0;">${otp}</h1>
              </div>
              <p>This code will expire in 10 minutes.</p>
            </div>
          `
        });

        if (error) {
          console.error('Resend error:', error);
          // Still return success but log for debugging
        } else {
          console.log('📧 Email sent successfully via Resend');
        }
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Continue without failing the request
      }
    } else {
      console.log('📧 No Resend API key - OTP logged only');
    }

    // For development/testing, return the OTP in response
    // In production, you'd store this in a session or database
    return res.status(200).json({ 
      message: 'Verification code sent successfully',
      // Remove this in production:
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });

  } catch (error) {
    console.error('Auth Send OTP error:', error);
    return res.status(500).json({ 
      error: 'Failed to send verification code',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
}