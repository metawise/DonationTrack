import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    // Try to import storage dynamically
    const { storage } = await import('../server/storage.js');
    const result = await storage.getAllTransactions(page, limit);
    return res.json(result);
  } catch (error) {
    console.error('Transactions error:', error);
    // Return mock data if database fails
    return res.json({
      transactions: [],
      total: 0
    });
  }
}