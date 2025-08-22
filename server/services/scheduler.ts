import * as cron from 'node-cron';
import { myWellSync } from './mywell-sync';
import { db } from '../db';
import { syncConfig } from '@shared/schema';
import { eq } from 'drizzle-orm';

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
      const [config] = await db
        .select()
        .from(syncConfig)
        .where(eq(syncConfig.name, 'mywell_transactions'))
        .limit(1);

      if (!config || !config.isActive) {
        console.log('MyWell sync is disabled');
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
        await this.runMyWellSync();
      }, {
        timezone: "America/New_York"
      });

      job.start();
      this.scheduledJobs.set('mywell_sync', job);

      console.log(`MyWell sync scheduled to run every ${config.syncFrequencyMinutes} minutes`);
    } catch (error) {
      console.error('Error scheduling MyWell sync:', error);
    }
  }

  private getCronExpression(minutes: number): string {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `0 */${hours} * * *`; // Every X hours
    } else {
      return `*/${minutes} * * * *`; // Every X minutes
    }
  }

  async runMyWellSync() {
    try {
      console.log('Starting scheduled MyWell sync...');
      
      // Sync last 7 days to catch any updates
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const startDateStr = startDate.toISOString().split('T')[0];

      const result = await myWellSync.syncTransactions(startDateStr, endDate);
      
      if (result.success) {
        console.log(`MyWell sync completed successfully: ${result.totalSynced} records synced`);
      } else {
        console.error('MyWell sync failed:', result.error);
      }
    } catch (error) {
      console.error('Error in scheduled MyWell sync:', error);
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
      status[name] = job.running || false;
    });

    return status;
  }
}

export const scheduler = new SchedulerService();