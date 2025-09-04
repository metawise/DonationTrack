import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse session cookie
    const cookies = req.headers.cookie || '';
    const sessionCookie = cookies.split('; ').find(c => c.startsWith('jfj_session='));
    
    if (!sessionCookie) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const sessionValue = sessionCookie.split('=')[1];
    const sessionData = Buffer.from(sessionValue, 'base64').toString();
    const user = JSON.parse(sessionData);

    // Return user data
    return res.status(200).json({ user });
  } catch (error) {
    console.error('Auth check error:', error);
    return res.status(401).json({ error: 'Not authenticated' });
  }
}