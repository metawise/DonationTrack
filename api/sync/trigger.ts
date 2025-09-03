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
    
    // Calculate date range - default to last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`📅 Sync date range: ${startDateStr} to ${endDateStr}`);
    
    // Call the MyWell sync API internally
    const baseUrl = req.headers.host ? `http://${req.headers.host}` : 'http://localhost:5000';
    console.log(`🔗 Calling internal sync: ${baseUrl}/api/sync/mywell`);
    
    const myWellResponse = await fetch(`${baseUrl}/api/sync/mywell`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        startDate: startDateStr,
        endDate: endDateStr,
      }),
    });

    if (!myWellResponse.ok) {
      const errorText = await myWellResponse.text();
      throw new Error(`MyWell sync failed: ${myWellResponse.status} ${errorText}`);
    }

    const syncResult = await myWellResponse.json();
    console.log('✅ Sync trigger completed:', syncResult.result);
    
    return res.status(200).json({
      message: 'Sync triggered and completed successfully',
      status: 'completed',
      result: syncResult.result,
      dateRange: {
        startDate: startDateStr,
        endDate: endDateStr
      }
    });
  } catch (error) {
    console.error('❌ Sync trigger failed:', error);
    return res.status(500).json({ 
      error: 'Failed to trigger sync',
      details: error.message 
    });
  }
}