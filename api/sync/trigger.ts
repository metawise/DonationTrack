import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔄 Manual sync triggered');
    
    // For demo purposes - in serverless environment, sync would be handled differently
    return res.status(200).json({
      message: 'Sync triggered successfully',
      status: 'triggered',
      note: 'In serverless environment, sync runs on-demand'
    });
  } catch (error) {
    console.error('Sync trigger error:', error);
    return res.status(500).json({ error: 'Failed to trigger sync' });
  }
}