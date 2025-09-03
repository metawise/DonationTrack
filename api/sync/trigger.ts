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
    
    // Import and call MyWell sync directly to avoid HTTP issues
    const { default: myWellHandler } = await import('./mywell');
    
    // Create a mock request/response for internal call
    const mockReq = {
      method: 'POST',
      body: {
        startDate: startDateStr,
        endDate: endDateStr,
      },
    } as any;
    
    let syncResult: any;
    const mockRes = {
      status: (code: number) => mockRes,
      json: (data: any) => { syncResult = data; return mockRes; },
      setHeader: () => mockRes,
    } as any;
    
    console.log(`🔗 Calling MyWell sync directly with dates: ${startDateStr} to ${endDateStr}`);
    await myWellHandler(mockReq, mockRes);

    if (!syncResult) {
      throw new Error('MyWell sync failed: No response received');
    }

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