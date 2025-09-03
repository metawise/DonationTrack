import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dbHelpers } from '../../lib/database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      // Get real sync config from database
      const config = await dbHelpers.getSyncConfig('mywell_transactions');
      
      if (!config) {
        // Create default config if it doesn't exist
        const defaultConfig = {
          id: 'mywell_transactions',
          name: 'MyWell Transactions Sync',
          isActive: true,
          syncFrequencyMinutes: 60,
          lastSyncAt: null,
          lastSyncStatus: 'never_run',
          lastSyncError: null,
          totalRecordsSynced: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await dbHelpers.createSyncConfig(defaultConfig);
        return res.json(defaultConfig);
      }
      
      return res.json(config);
    } catch (error) {
      console.error('Failed to get sync config:', error);
      return res.status(500).json({ error: 'Failed to retrieve sync configuration' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { isActive, syncFrequencyMinutes } = req.body;
      
      if (typeof isActive !== 'boolean' || typeof syncFrequencyMinutes !== 'number') {
        return res.status(400).json({ 
          error: 'Invalid input: isActive must be boolean, syncFrequencyMinutes must be number' 
        });
      }
      
      if (syncFrequencyMinutes < 1 || syncFrequencyMinutes > 1440) {
        return res.status(400).json({ 
          error: 'syncFrequencyMinutes must be between 1 and 1440 (24 hours)' 
        });
      }
      
      await dbHelpers.updateSyncConfig('mywell_transactions', {
        isActive,
        syncFrequencyMinutes,
        updatedAt: new Date()
      });
      
      const updatedConfig = await dbHelpers.getSyncConfig('mywell_transactions');
      return res.json(updatedConfig);
    } catch (error) {
      console.error('Failed to update sync config:', error);
      return res.status(500).json({ error: 'Failed to update sync configuration' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}