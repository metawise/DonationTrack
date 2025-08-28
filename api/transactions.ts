import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dbHelpers } from '../lib/database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      const result = await dbHelpers.getTransactions(page, limit);
      return res.json(result);
    }

    if (req.method === 'POST') {
      const transaction = await dbHelpers.createTransaction(req.body);
      return res.status(201).json(transaction);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Transactions API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}