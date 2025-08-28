import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dbHelpers } from '../../lib/database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Creating transaction:', req.body);
    
    // For demo purposes, create a mock transaction with required fields
    const transactionData = {
      ...req.body,
      id: `txn_${Date.now()}`,
      externalCustomerId: req.body.customerId || `ext_cust_${Date.now()}`,
      status: 'SETTLED',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const transaction = await dbHelpers.createTransaction(transactionData);
    return res.status(201).json({
      success: true,
      transaction,
      message: 'Transaction created successfully'
    });
  } catch (error) {
    console.error('Create transaction API error:', error);
    return res.status(500).json({ error: 'Failed to create transaction' });
  }
}