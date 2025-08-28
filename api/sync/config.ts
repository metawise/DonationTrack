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

  // Return demo sync config
  return res.json({
    id: 'default-sync-config',
    name: 'mywell_transactions',
    isActive: false, // Disabled in demo mode
    syncFrequencyMinutes: 60,
    lastSyncAt: null,
    lastSyncStatus: 'disabled',
    lastSyncError: 'Sync disabled in demo mode',
    createdAt: new Date(),
    updatedAt: new Date()
  });
}