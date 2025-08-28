import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dbHelpers } from '../../../lib/database';

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
    const pathParts = req.url?.split('/').filter(Boolean) || [];
    const transactionId = pathParts.find(part => part !== 'api' && part !== 'transactions' && part !== 'refund');
    
    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID required' });
    }

    console.log('🔄 Processing refund for transaction:', transactionId);
    
    // For demo purposes - simulate refund processing
    const refundResult = {
      transactionId,
      refundId: `ref_${Date.now()}`,
      status: 'processed',
      refundAmount: req.body?.amount || 'full',
      processedAt: new Date()
    };
    
    return res.status(200).json({
      message: 'Refund processed successfully',
      refund: refundResult
    });
  } catch (error) {
    console.error('Refund API error:', error);
    return res.status(500).json({ error: 'Failed to process refund' });
  }
}