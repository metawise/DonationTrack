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
    // Try to import storage dynamically
    const { storage } = await import('../../server/storage.js');
    const config = await storage.getSyncConfig('mywell_transactions');
    
    if (!config) {
      // Return default config if none exists
      return res.json({
        id: 'default-sync-config',
        name: 'mywell_transactions',
        isActive: true,
        syncFrequencyMinutes: 60,
        lastSyncAt: null,
        lastSyncStatus: null,
        lastSyncError: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    return res.json(config);
  } catch (error) {
    console.error('Sync config error:', error);
    // Return default config if database fails
    return res.json({
      id: 'default-sync-config',
      name: 'mywell_transactions',
      isActive: false, // Disabled when database is not available
      syncFrequencyMinutes: 60,
      lastSyncAt: null,
      lastSyncStatus: 'error',
      lastSyncError: 'Database connection failed',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
}