import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dbHelpers } from '../../lib/database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const metrics = await dbHelpers.getDashboardMetrics();
    return res.json(metrics);
  } catch (error) {
    console.error('Dashboard metrics API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}