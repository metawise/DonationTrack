import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dbHelpers } from '../../lib/database';

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
    const { startDate, endDate } = req.body;
    console.log('🔄 MyWell sync requested:', { startDate, endDate });
    
    // For demo purposes - simulate MyWell API sync
    const syncResult = {
      status: 'success',
      transactionsProcessed: 5,
      customersCreated: 2,
      customersUpdated: 1,
      dateRange: { startDate, endDate },
      syncTime: new Date()
    };
    
    return res.status(200).json({
      message: 'MyWell sync completed successfully',
      result: syncResult
    });
  } catch (error) {
    console.error('MyWell sync error:', error);
    return res.status(500).json({ error: 'MyWell sync failed' });
  }
}