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
    isActive: true, // Enabled for full functionality
    syncFrequencyMinutes: 60,
    lastSyncAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    lastSyncStatus: 'success',
    lastSyncError: null,
    totalRecordsSynced: 105,
    createdAt: new Date(),
    updatedAt: new Date()
  });
}