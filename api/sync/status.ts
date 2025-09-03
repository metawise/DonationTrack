import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dbHelpers } from '../../lib/database';

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
    // Get sync config to determine status
    const config = await dbHelpers.getSyncConfig('mywell_transactions');
    
    if (!config) {
      return res.json({
        scheduler: {
          mywell_sync: {
            status: 'not_configured',
            message: 'Sync configuration not found'
          }
        },
        nextSyncTime: null as string | null,
        lastSyncAt: null,
        syncStatus: 'not_configured'
      });
    }

    // Calculate next sync time based on frequency
    let nextSyncTime = null;
    if (config.isActive && config.lastSyncAt && config.syncFrequencyMinutes) {
      const lastSync = new Date(config.lastSyncAt);
      const nextSync = new Date(lastSync.getTime() + (config.syncFrequencyMinutes * 60 * 1000));
      nextSyncTime = nextSync.toISOString();
    }

    // Determine sync status
    let syncStatus = 'disabled';
    let message = 'Sync is disabled';
    
    if (config.isActive) {
      if (config.lastSyncStatus === 'success') {
        syncStatus = 'active';
        message = `Last sync successful at ${config.lastSyncAt}`;
      } else if (config.lastSyncStatus === 'error') {
        syncStatus = 'error';
        message = `Last sync failed: ${config.lastSyncError}`;
      } else if (config.lastSyncStatus === 'never_run') {
        syncStatus = 'pending';
        message = 'Sync configured but never run';
      } else {
        syncStatus = 'partial_success';
        message = `Last sync had issues: ${config.lastSyncError}`;
      }
    }

    return res.json({
      scheduler: {
        mywell_sync: {
          status: syncStatus,
          message,
          isActive: config.isActive,
          frequency: `${config.syncFrequencyMinutes} minutes`,
          totalRecordsSynced: config.totalRecordsSynced
        }
      },
      nextSyncTime,
      lastSyncAt: config.lastSyncAt,
      syncStatus,
      config: {
        syncFrequencyMinutes: config.syncFrequencyMinutes,
        isActive: config.isActive,
        lastSyncStatus: config.lastSyncStatus,
        lastSyncError: config.lastSyncError,
        totalRecordsSynced: config.totalRecordsSynced
      }
    });
  } catch (error) {
    console.error('Failed to get sync status:', error);
    return res.status(500).json({ 
      error: 'Failed to retrieve sync status',
      details: error.message 
    });
  }
}