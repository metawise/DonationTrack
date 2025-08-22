import { db } from '../db';
import { customers, transactions, syncConfig } from '@shared/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { storage } from '../storage';
import { randomUUID } from 'crypto';

const MYWELL_API_BASE = 'https://dev-api.mywell.io/api';
const MYWELL_API_TOKEN = '84c7f095-8f50-4645-bc65-b0163c104839';

export interface MyWellTransaction {
  id: string;
  type: string;
  kind: string;
  amount: number;
  emailAddress: string | null;
  paymentMethod: string;
  responseBody: any;
  status: string;
  responseCode: number;
  responseMessage: string | null;
  customerId: string;
  subscriptionId: string | null;
  settlementBatchId: string;
  billingAddress: any;
  shippingAddress: any;
  createdAt: string;
  updatedAt: string;
  settledAt: string | null;
  ipAddress: string | null;
  piUpdatedAt: string;
  description: string | null;
}

export interface MyWellApiResponse {
  transactions: MyWellTransaction[];
  hasMore: boolean;
  total: number;
}

export class MyWellSyncService {
  private async fetchTransactions(
    startDate: string,
    endDate: string,
    offset: number = 0,
    limit: number = 500
  ): Promise<MyWellApiResponse> {
    try {
      const response = await fetch(`${MYWELL_API_BASE}/transaction/gift/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apiToken': MYWELL_API_TOKEN,
        },
        body: JSON.stringify({
          createdAt: {
            startDate,
            endDate,
          },
          limit,
          offset,
        }),
      });

      if (!response.ok) {
        throw new Error(`MyWell API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Adapt the response format to match our interface
      return {
        transactions: Array.isArray(data) ? data : data.transactions || [],
        hasMore: data.hasMore || false,
        total: data.total || (Array.isArray(data) ? data.length : 0),
      };
    } catch (error) {
      console.error('Error fetching MyWell transactions:', error);
      throw error;
    }
  }

  private async upsertCustomer(myWellTransaction: MyWellTransaction) {
    const { billingAddress, customerId } = myWellTransaction;
    
    if (!billingAddress || !customerId) return null;

    try {
      // Extract email from multiple sources with priority order  
      const email = myWellTransaction.emailAddress || 
                   billingAddress?.email || 
                   myWellTransaction.responseBody?.email ||
                   myWellTransaction.responseBody?.customer?.email ||
                   null;
      
      console.log(`📧 Processing customer: ${billingAddress?.firstName} ${billingAddress?.lastName}, Email: ${email || 'No email found'}`);
      
      const customerData = {
        id: randomUUID(),
        externalCustomerId: customerId,
        firstName: billingAddress?.firstName || '',
        lastName: billingAddress?.lastName || '',
        email: email,
        phone: billingAddress?.phone || null,
        street1: billingAddress?.street1 || null,
        street2: billingAddress?.street2 || null,
        city: billingAddress?.city || null,
        state: billingAddress?.state || null,
        postalCode: billingAddress?.postalCode || null,
        country: billingAddress?.country || null,
        customerType: 'one-time',
        totalDonated: 0,
        transactionCount: 0,
        lastSyncAt: new Date(),
      };

      // Use the storage interface to find or create customer
      const customer = await storage.findOrCreateCustomer(customerData);
      return customer;
    } catch (error) {
      console.error('Error upserting customer:', error);
      return null;
    }
  }

  private async upsertTransaction(myWellTransaction: MyWellTransaction, customerId?: string) {
    try {
      const transactionData = {
        id: myWellTransaction.id,
        externalCustomerId: myWellTransaction.customerId,
        customerId: customerId || null,
        type: myWellTransaction.type,
        kind: myWellTransaction.kind,
        amount: myWellTransaction.amount,
        emailAddress: myWellTransaction.emailAddress,
        paymentMethod: myWellTransaction.paymentMethod,
        responseBody: myWellTransaction.responseBody,
        status: myWellTransaction.status,
        responseCode: myWellTransaction.responseCode,
        responseMessage: myWellTransaction.responseMessage,
        subscriptionId: myWellTransaction.subscriptionId,
        settlementBatchId: myWellTransaction.settlementBatchId,
        billingAddress: myWellTransaction.billingAddress,
        shippingAddress: myWellTransaction.shippingAddress,
        ipAddress: myWellTransaction.ipAddress,
        description: myWellTransaction.description,
        createdAt: new Date(myWellTransaction.createdAt),
        updatedAt: new Date(myWellTransaction.updatedAt),
        settledAt: myWellTransaction.settledAt ? new Date(myWellTransaction.settledAt) : null,
        piUpdatedAt: new Date(myWellTransaction.piUpdatedAt),
        syncedAt: new Date(),
      };

      // Use ON CONFLICT to handle duplicates
      const [transaction] = await db
        .insert(transactions)
        .values(transactionData)
        .onConflictDoUpdate({
          target: transactions.id,
          set: transactionData,
        })
        .returning();

      return transaction;
    } catch (error) {
      console.error('Error upserting transaction:', error);
      return null;
    }
  }

  async syncTransactions(startDate: string, endDate: string): Promise<{
    success: boolean;
    totalSynced: number;
    error?: string;
  }> {
    let totalSynced = 0;
    let offset = 0;
    const limit = 500;

    try {
      // Update sync config status
      await db
        .update(syncConfig)
        .set({
          lastSyncStatus: 'in_progress',
          lastSyncError: null,
          updatedAt: new Date(),
        })
        .where(eq(syncConfig.name, 'mywell_transactions'));

      console.log(`Starting MyWell sync for ${startDate} to ${endDate}`);

      do {
        const response = await this.fetchTransactions(startDate, endDate, offset, limit);
        
        if (!response.transactions || response.transactions.length === 0) {
          break;
        }

        console.log(`Processing batch: ${offset}-${offset + response.transactions.length}`);

        // Process each transaction
        for (const myWellTransaction of response.transactions) {
          try {
            // Log transaction data for debugging
            if (totalSynced < 3) { // Only log first 3 for debugging
              console.log(`🔍 Transaction sample:`, {
                id: myWellTransaction.id,
                emailAddress: myWellTransaction.emailAddress,
                billingEmail: myWellTransaction.billingAddress?.email,
                hasResponseBody: !!myWellTransaction.responseBody
              });
            }
            
            // First, upsert the customer
            const customer = await this.upsertCustomer(myWellTransaction);
            
            // Then, upsert the transaction
            await this.upsertTransaction(myWellTransaction, customer?.id);
            
            totalSynced++;
          } catch (error) {
            console.error(`Error processing transaction ${myWellTransaction.id}:`, error);
            // Continue with other transactions
          }
        }

        offset += limit;

        // Break if we've processed all available transactions
        if (!response.hasMore || response.transactions.length < limit) {
          break;
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } while (true);

      // Update sync config with success status
      await db
        .update(syncConfig)
        .set({
          lastSyncAt: new Date(),
          lastSyncStatus: 'success',
          totalRecordsSynced: totalSynced,
          updatedAt: new Date(),
        })
        .where(eq(syncConfig.name, 'mywell_transactions'));

      console.log(`MyWell sync completed: ${totalSynced} transactions synced`);

      return { success: true, totalSynced };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update sync config with error status
      await db
        .update(syncConfig)
        .set({
          lastSyncStatus: 'error',
          lastSyncError: errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(syncConfig.name, 'mywell_transactions'));

      console.error('MyWell sync failed:', error);
      
      return { 
        success: false, 
        totalSynced, 
        error: errorMessage 
      };
    }
  }

  async getLastSyncInfo() {
    const [config] = await db
      .select()
      .from(syncConfig)
      .where(eq(syncConfig.name, 'mywell_transactions'))
      .limit(1);

    return config;
  }

  async updateSyncFrequency(frequencyMinutes: number) {
    await db
      .update(syncConfig)
      .set({
        syncFrequencyMinutes: frequencyMinutes,
        updatedAt: new Date(),
      })
      .where(eq(syncConfig.name, 'mywell_transactions'));
  }
}

export const myWellSync = new MyWellSyncService();