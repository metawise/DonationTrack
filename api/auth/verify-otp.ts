import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Debug logging
    console.log('Request body:', req.body);
    console.log('Request body type:', typeof req.body);

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

    const { email, code, otp } = body;
    const actualOtp = code || otp; // Accept both 'code' and 'otp' field names

    console.log('Parsed email:', email);
    console.log('Received code field:', code);
    console.log('Received otp field:', otp); 
    console.log('Final actualOtp:', actualOtp);

    if (!email || !actualOtp) {
      return res.status(400).json({ 
        error: 'Email and OTP are required',
        debug: {
          receivedEmail: email,
          receivedCode: code,
          receivedOtp: otp,
          actualOtp: actualOtp,
          bodyType: typeof req.body,
          rawBody: req.body
        }
      });
    }

    // For demo purposes - accept any 6-digit OTP
    if (actualOtp.length === 6 && /^\d+$/.test(actualOtp)) {
      // Create a simple user object for the demo
      const user = {
        id: 'demo-user-id',
        firstName: 'Demo',
        lastName: 'User',
        email: email,
        role: 'admin'
      };

      // Set a session cookie (demo approach)
      const sessionData = JSON.stringify(user);
      res.setHeader('Set-Cookie', [
        `jfj_session=${Buffer.from(sessionData).toString('base64')}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`
      ]);

      return res.status(200).json({
        message: 'Authentication successful',
        user
      });
    }

    return res.status(400).json({ error: 'Invalid verification code' });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}