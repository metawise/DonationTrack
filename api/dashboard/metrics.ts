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

  // Return demo metrics data
  return res.json({
    totalDonations: 50000,
    activeSubscriptions: 150,
    monthlyRecurring: 25000,
    newDonorsThisMonth: 42,
    averageDonation: 125.50,
    topDonationMethod: 'Credit Card'
  });
}