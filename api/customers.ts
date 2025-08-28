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

  const page = req.query.page ? parseInt(req.query.page as string) : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
  const consolidated = req.query.consolidated === 'true';

  // Return demo customers data
  return res.json({
    customers: [],
    total: 0
  });
}