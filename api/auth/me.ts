import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check for session cookie
    const cookies = req.headers.cookie;
    if (!cookies) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Parse session cookie
    const sessionMatch = cookies.match(/jfj_session=([^;]+)/);
    if (!sessionMatch) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Decode session data
    const sessionData = Buffer.from(sessionMatch[1], 'base64').toString('utf-8');
    const user = JSON.parse(sessionData);

    return res.status(200).json({
      message: 'Authenticated',
      user
    });
  } catch (error) {
    console.error('Session validation error:', error);
    return res.status(401).json({ error: 'Not authenticated' });
  }
}