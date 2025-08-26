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
    const { email, otp } = req.body || {};

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // For demo purposes - accept any 6-digit OTP
    if (otp.length === 6 && /^\d+$/.test(otp)) {
      // Create a simple user object for the demo
      const user = {
        id: 'demo-user-id',
        firstName: 'Demo',
        lastName: 'User',
        email: email,
        role: 'admin'
      };

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