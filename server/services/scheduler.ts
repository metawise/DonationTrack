import * as cron from 'node-cron';
import { myWellSync } from './mywell-sync.js';
import { db } from '../db.js';
import { syncConfig } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

class SchedulerService {
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

  async initializeScheduler() {
    console.log('Initializing scheduler service...');

    // Create default sync config if it doesn't exist
    await this.ensureDefaultSyncConfig();

    // Start the default sync job
    await this.scheduleMyWellSync();
  }

  private async ensureDefaultSyncConfig() {
    try {
      const [existingConfig] = await db
        .select()
        .from(syncConfig)
        .where(eq(syncConfig.name, 'mywell_transactions'))
        .limit(1);

      if (!existingConfig) {
        await db.insert(syncConfig).values({
          name: 'mywell_transactions',
          isActive: true,
          syncFrequencyMinutes: 60, // Default 1 hour
          lastSyncAt: null,
          lastSyncStatus: null,
          lastSyncError: null,
          totalRecordsSynced: 0,
        });
        console.log('Created default MyWell sync configuration');
      }
    } catch (error) {
      console.error('Error ensuring default sync config:', error);
    }
  }

  async scheduleMyWellSync() {
    try {
      // Check if MyWell integration is enabled
      if (!myWellSync.isEnabled()) {
        console.log('MyWell sync is disabled - no API token provided');
        return;
      }

      const [config] = await db
        .select()
        .from(syncConfig)
        .where(eq(syncConfig.name, 'mywell_transactions'))
        .limit(1);

      if (!config || !config.isActive) {
        console.log('MyWell sync is disabled in configuration');
        return;
      }

      // Stop existing job if running
      const existingJob = this.scheduledJobs.get('mywell_sync');
      if (existingJob) {
        existingJob.stop();
        this.scheduledJobs.delete('mywell_sync');
      }

      // Create cron expression based on frequency in minutes
      const cronExpression = this.getCronExpression(config.syncFrequencyMinutes);
      
      const job = cron.schedule(cronExpression, async () => {
        console.log(`🔄 Auto sync triggered - frequency: ${config.syncFrequencyMinutes} minutes`);
        await this.runMyWellSync();
      }, {
        timezone: "America/New_York"
      });

      this.scheduledJobs.set('mywell_sync', job);
      
      console.log(`✅ MyWell sync scheduled to run every ${config.syncFrequencyMinutes} minutes using cron: ${cronExpression}`);
    } catch (error) {
      console.error('Error scheduling MyWell sync:', error);
    }
  }

  private getCronExpression(minutes: number): string {
    console.log(`Creating cron expression for ${minutes} minutes`);
    
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const cronExpr = `0 */${hours} * * *`; // Every X hours
      console.log(`Hourly cron expression: ${cronExpr}`);
      return cronExpr;
    } else if (minutes >= 1) {
      const cronExpr = `*/${minutes} * * * *`; // Every X minutes  
      console.log(`Minute cron expression: ${cronExpr}`);
      return cronExpr;
    } else {
      // Default to every 5 minutes if invalid
      const cronExpr = `*/5 * * * *`;
      console.log(`Default cron expression (5 min): ${cronExpr}`);
      return cronExpr;
    }
  }

  async runMyWellSync() {
    try {
      console.log('🔄 Starting scheduled MyWell sync...');
      
      // Update sync config to track that sync is starting
      await db
        .update(syncConfig)
        .set({
          lastSyncAt: new Date(),
          lastSyncStatus: 'running',
          lastSyncError: null,
          updatedAt: new Date(),
        })
        .where(eq(syncConfig.name, 'mywell_transactions'));
      
      // Get last sync date and sync from then, or last 24 hours if no previous sync
      const [lastSyncConfig] = await db
        .select()
        .from(syncConfig)
        .where(eq(syncConfig.name, 'mywell_transactions'))
        .limit(1);
      
      // Set end date to tomorrow to catch all transactions including today's
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const endDate = tomorrow.toISOString().split('T')[0];
      let startDate = new Date();
      
      if (lastSyncConfig?.lastSyncAt) {
        // Start from last successful sync date
        startDate = new Date(lastSyncConfig.lastSyncAt);
        startDate.setDate(startDate.getDate() - 1); // Go back 1 day to catch any updates
      } else {
        // No previous sync, go back 7 days to get recent data
        startDate.setDate(startDate.getDate() - 7);
      }
      
      const startDateStr = startDate.toISOString().split('T')[0];
      console.log(`📅 Syncing from ${startDateStr} to ${endDate}`);

      const result = await myWellSync.syncTransactions(startDateStr, endDate);
      
      if (result.success) {
        console.log(`✅ Scheduled MyWell sync completed successfully: ${result.totalSynced} records synced`);
        
        // Update sync config with success status
        await db
          .update(syncConfig)
          .set({
            lastSyncStatus: 'success',
            totalRecordsSynced: sql`${syncConfig.totalRecordsSynced} + ${result.totalSynced}`,
            updatedAt: new Date(),
          })
          .where(eq(syncConfig.name, 'mywell_transactions'));
      } else {
        console.error('❌ Scheduled MyWell sync failed:', result.error);
        
        // Update sync config with failure status
        await db
          .update(syncConfig)
          .set({
            lastSyncStatus: 'failed',
            lastSyncError: result.error || 'Unknown error',
            updatedAt: new Date(),
          })
          .where(eq(syncConfig.name, 'mywell_transactions'));
      }
    } catch (error) {
      console.error('❌ Error in scheduled MyWell sync:', error);
      
      // Update sync config with error status
      await db
        .update(syncConfig)
        .set({
          lastSyncStatus: 'failed',
          lastSyncError: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date(),
        })
        .where(eq(syncConfig.name, 'mywell_transactions'));
    }
  }

  async updateSyncFrequency(frequencyMinutes: number) {
    await db
      .update(syncConfig)
      .set({
        syncFrequencyMinutes: frequencyMinutes,
        updatedAt: new Date(),
      })
      .where(eq(syncConfig.name, 'mywell_transactions'));

    // Reschedule the job
    await this.scheduleMyWellSync();
  }

  async toggleSync(isActive: boolean) {
    await db
      .update(syncConfig)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(syncConfig.name, 'mywell_transactions'));

    if (isActive) {
      await this.scheduleMyWellSync();
    } else {
      const existingJob = this.scheduledJobs.get('mywell_sync');
      if (existingJob) {
        existingJob.stop();
        this.scheduledJobs.delete('mywell_sync');
      }
    }
  }

  getJobStatus(): { [key: string]: boolean } {
    const status: { [key: string]: boolean } = {};
    
    this.scheduledJobs.forEach((job, name) => {
      status[name] = job.getStatus() === 'scheduled';
    });

    console.log('📊 Current job status:', status);
    return status;
  }
  
  // Method to get detailed scheduler info for debugging
  getSchedulerInfo(): { [key: string]: any } {
    const info: { [key: string]: any } = {};
    
    this.scheduledJobs.forEach((job, name) => {
      info[name] = {
        status: job.getStatus()
      };
    });

    return info;
  }

  // Get the next scheduled sync time
  async getNextSyncTime(): Promise<Date | null> {
    try {
      const [config] = await db
        .select()
        .from(syncConfig)
        .where(eq(syncConfig.name, 'mywell_transactions'))
        .limit(1);

      if (!config || !config.isActive || !config.lastSyncAt) {
        return null;
      }

      const nextSync = new Date(config.lastSyncAt);
      nextSync.setMinutes(nextSync.getMinutes() + config.syncFrequencyMinutes);
      return nextSync;
    } catch (error) {
      console.error('Error getting next sync time:', error);
      return null;
    }
  }
}

export const scheduler = new SchedulerService();