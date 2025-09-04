import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../shared/schema';
import { eq, desc, count, sum, sql, and, gte, or, isNotNull } from 'drizzle-orm';
import { subDays, startOfMonth } from 'date-fns';

// Initialize database connection
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const connection = neon(dbUrl);
export const db = drizzle(connection, { schema });

// Database helper functions for API routes
export const dbHelpers = {
  // Customers
  async getCustomers(page = 1, limit = 50, consolidated = false) {
    const offset = (page - 1) * limit;
    
    const [customers, [{ total }]] = await Promise.all([
      db.select()
        .from(schema.customers)
        .orderBy(desc(schema.customers.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(schema.customers)
    ]);

    return { customers, total: total || 0 };
  },

  async getCustomerById(id: string) {
    const [customer] = await db.select()
      .from(schema.customers)
      .where(eq(schema.customers.id, id))
      .limit(1);
    
    return customer || null;
  },

  async createCustomer(customer: any) {
    const [newCustomer] = await db.insert(schema.customers)
      .values(customer)
      .returning();
    
    return newCustomer;
  },

  async findCustomerByName(firstName: string, lastName: string) {
    const [customer] = await db.select()
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.firstName, firstName),
          eq(schema.customers.lastName, lastName)
        )
      )
      .limit(1);
    
    return customer || null;
  },

  async findCustomerByExternalId(externalCustomerId: string) {
    const [customer] = await db.select()
      .from(schema.customers)
      .where(eq(schema.customers.externalCustomerId, externalCustomerId))
      .limit(1);
    
    return customer || null;
  },

  async updateCustomer(id: string, customerData: any) {
    try {
      const [updatedCustomer] = await db.update(schema.customers)
        .set({ ...customerData, updatedAt: new Date() })
        .where(eq(schema.customers.id, id))
        .returning();
      
      return updatedCustomer;
    } catch (error: any) {
      console.error(`Error updating customer ${id}:`, error);
      throw error;
    }
  },

  // Transactions
  async getTransactions(page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    
    const [transactions, [{ total }]] = await Promise.all([
      db.select({
        id: schema.transactions.id,
        externalCustomerId: schema.transactions.externalCustomerId,
        customerId: schema.transactions.customerId,
        type: schema.transactions.type,
        kind: schema.transactions.kind,
        amount: schema.transactions.amount,
        emailAddress: schema.transactions.emailAddress,
        paymentMethod: schema.transactions.paymentMethod,
        responseBody: schema.transactions.responseBody,
        status: schema.transactions.status,
        responseCode: schema.transactions.responseCode,
        responseMessage: schema.transactions.responseMessage,
        subscriptionId: schema.transactions.subscriptionId,
        settlementBatchId: schema.transactions.settlementBatchId,
        billingAddress: schema.transactions.billingAddress,
        shippingAddress: schema.transactions.shippingAddress,
        ipAddress: schema.transactions.ipAddress,
        description: schema.transactions.description,
        createdAt: schema.transactions.createdAt,
        updatedAt: schema.transactions.updatedAt,
        settledAt: schema.transactions.settledAt,
        piUpdatedAt: schema.transactions.piUpdatedAt,
        syncedAt: schema.transactions.syncedAt,
        // Join customer data
        customer: {
          id: schema.customers.id,
          firstName: schema.customers.firstName,
          lastName: schema.customers.lastName,
          email: schema.customers.email,
        }
      })
        .from(schema.transactions)
        .leftJoin(schema.customers, eq(schema.transactions.customerId, schema.customers.id))
        .orderBy(desc(schema.transactions.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(schema.transactions)
    ]);

    return { transactions, total: total || 0 };
  },

  async getTransactionById(id: string) {
    const [transaction] = await db.select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, id))
      .limit(1);
    
    return transaction || null;
  },

  async createTransaction(transaction: any) {
    const [newTransaction] = await db.insert(schema.transactions)
      .values(transaction)
      .returning();
    
    return newTransaction;
  },

  async upsertTransaction(transaction: any) {
    try {
      // First try to find existing transaction
      const [existing] = await db.select()
        .from(schema.transactions)
        .where(eq(schema.transactions.id, transaction.id))
        .limit(1);

      if (existing) {
        // Update existing transaction
        const [updated] = await db.update(schema.transactions)
          .set({ ...transaction, updatedAt: new Date(), syncedAt: new Date() })
          .where(eq(schema.transactions.id, transaction.id))
          .returning();
        return updated;
      } else {
        // Create new transaction
        const [created] = await db.insert(schema.transactions)
          .values(transaction)
          .returning();
        return created;
      }
    } catch (error: any) {
      console.error(`Error upserting transaction ${transaction.id}:`, error);
      throw error;
    }
  },

  async deleteExistingTransaction(id: string) {
    try {
      await db.delete(schema.transactions)
        .where(eq(schema.transactions.id, id));
    } catch (error: any) {
      console.error(`Error deleting transaction ${id}:`, error);
      // Continue silently if transaction doesn't exist
    }
  },

  // Staff
  async getStaff() {
    return await db.select()
      .from(schema.staff)
      .orderBy(desc(schema.staff.createdAt));
  },

  async getStaffById(id: string) {
    const [staff] = await db.select()
      .from(schema.staff)
      .where(eq(schema.staff.id, id))
      .limit(1);
    
    return staff || null;
  },

  async getStaffByEmail(email: string) {
    const [staff] = await db.select()
      .from(schema.staff)
      .where(eq(schema.staff.email, email))
      .limit(1);
    
    return staff || null;
  },

  async createStaff(staff: any) {
    const [newStaff] = await db.insert(schema.staff)
      .values(staff)
      .returning();
    
    return newStaff;
  },

  // Dashboard metrics
  async getDashboardMetrics() {
    const thisMonth = startOfMonth(new Date());

    try {
      // Get total donations and average
      const [{ totalDonations }] = await db.select({ totalDonations: sum(schema.transactions.amount) })
        .from(schema.transactions)
        .where(eq(schema.transactions.status, 'SETTLED'));

      const [{ avgDonation }] = await db.select({ 
        avgDonation: sql<number>`COALESCE(AVG(${schema.transactions.amount}), 0)` 
      })
        .from(schema.transactions)
        .where(eq(schema.transactions.status, 'SETTLED'));

      // Get this month's amount
      const [{ thisMonthAmount }] = await db.select({ thisMonthAmount: sum(schema.transactions.amount) })
        .from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.status, 'SETTLED'),
            gte(schema.transactions.createdAt, thisMonth)
          )
        );

      // Get unique customer count using direct SQL count
      const [{ uniqueCustomerCount }] = await db.select({ 
        uniqueCustomerCount: sql<number>`COUNT(DISTINCT ${schema.transactions.externalCustomerId})` 
      })
        .from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.status, 'SETTLED'),
            isNotNull(schema.transactions.externalCustomerId)
          )
        );

      return {
        totalDonations: Math.round((Number(totalDonations) || 0) / 100), // Convert cents to dollars
        activeSubscribers: Number(uniqueCustomerCount) || 0, // Real count of unique donors
        thisMonth: Math.round((Number(thisMonthAmount) || 0) / 100), // Convert cents to dollars
        avgDonation: Math.round((Number(avgDonation) || 0) / 100) // Convert cents to dollars
      };
    } catch (error) {
      console.error('Dashboard metrics error:', error);
      // Return default values if database is empty or there's an error
      return {
        totalDonations: 0,
        activeSubscribers: 0,
        thisMonth: 0,
        avgDonation: 0
      };
    }
  },

  // Sync configs
  async getSyncConfigs() {
    return await db.select()
      .from(schema.syncConfig)
      .orderBy(desc(schema.syncConfig.createdAt));
  },

  async getSyncConfig(id: string) {
    const [config] = await db.select()
      .from(schema.syncConfig)
      .where(eq(schema.syncConfig.id, id))
      .limit(1);
    
    return config || null;
  },

  async createSyncConfig(config: any) {
    const [newConfig] = await db.insert(schema.syncConfig)
      .values(config)
      .returning();
    
    return newConfig;
  },

  async updateSyncConfig(id: string, updates: any) {
    const [updatedConfig] = await db.update(schema.syncConfig)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.syncConfig.id, id))
      .returning();
    
    return updatedConfig;
  }
};