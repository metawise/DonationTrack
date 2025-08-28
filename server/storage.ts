import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@shared/schema';
import type { 
  Customer, 
  Transaction, 
  Staff, 
  SyncConfig, 
  InsertCustomer, 
  InsertTransaction, 
  InsertStaff,
  InsertSyncConfig,
  DashboardMetrics 
} from '@shared/schema';
import { eq, desc, count, sum, sql, and, gte } from 'drizzle-orm';
import { subDays, startOfMonth } from 'date-fns';

// Initialize database connection
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const connection = neon(dbUrl);
export const db = drizzle(connection, { schema });

export interface IStorage {
  // Customers
  getCustomers(page?: number, limit?: number, consolidated?: boolean): Promise<{ customers: Customer[], total: number }>;
  getCustomerById(id: string): Promise<Customer | null>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: string): Promise<void>;

  // Transactions
  getTransactions(page?: number, limit?: number): Promise<{ transactions: Transaction[], total: number }>;
  getTransactionById(id: string): Promise<Transaction | null>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;

  // Staff
  getStaff(): Promise<Staff[]>;
  getStaffById(id: string): Promise<Staff | null>;
  createStaff(staff: InsertStaff): Promise<Staff>;
  updateStaff(id: string, staff: Partial<InsertStaff>): Promise<Staff>;
  deleteStaff(id: string): Promise<void>;

  // Sync Configuration
  getSyncConfigs(): Promise<SyncConfig[]>;
  getSyncConfigById(id: string): Promise<SyncConfig | null>;
  createSyncConfig(config: InsertSyncConfig): Promise<SyncConfig>;
  updateSyncConfig(id: string, config: Partial<InsertSyncConfig>): Promise<SyncConfig>;

  // Dashboard
  getDashboardMetrics(): Promise<DashboardMetrics>;
}

export class DatabaseStorage implements IStorage {
  async getCustomers(page = 1, limit = 50, consolidated = false): Promise<{ customers: Customer[], total: number }> {
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
  }

  async getCustomerById(id: string): Promise<Customer | null> {
    const [customer] = await db.select()
      .from(schema.customers)
      .where(eq(schema.customers.id, id))
      .limit(1);
    
    return customer || null;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(schema.customers)
      .values(customer)
      .returning();
    
    return newCustomer;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer> {
    const [updatedCustomer] = await db.update(schema.customers)
      .set({ ...customer, updatedAt: new Date() })
      .where(eq(schema.customers.id, id))
      .returning();
    
    if (!updatedCustomer) {
      throw new Error('Customer not found');
    }
    
    return updatedCustomer;
  }

  async deleteCustomer(id: string): Promise<void> {
    await db.delete(schema.customers)
      .where(eq(schema.customers.id, id));
  }

  async getTransactions(page = 1, limit = 50): Promise<{ transactions: Transaction[], total: number }> {
    const offset = (page - 1) * limit;
    
    const [transactions, [{ total }]] = await Promise.all([
      db.select()
        .from(schema.transactions)
        .orderBy(desc(schema.transactions.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(schema.transactions)
    ]);

    return { transactions, total: total || 0 };
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    const [transaction] = await db.select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, id))
      .limit(1);
    
    return transaction || null;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(schema.transactions)
      .values(transaction)
      .returning();
    
    return newTransaction;
  }

  async updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction> {
    const [updatedTransaction] = await db.update(schema.transactions)
      .set({ ...transaction, updatedAt: new Date() })
      .where(eq(schema.transactions.id, id))
      .returning();
    
    if (!updatedTransaction) {
      throw new Error('Transaction not found');
    }
    
    return updatedTransaction;
  }

  async deleteTransaction(id: string): Promise<void> {
    await db.delete(schema.transactions)
      .where(eq(schema.transactions.id, id));
  }

  async getStaff(): Promise<Staff[]> {
    return await db.select()
      .from(schema.staff)
      .orderBy(desc(schema.staff.createdAt));
  }

  async getStaffById(id: string): Promise<Staff | null> {
    const [staff] = await db.select()
      .from(schema.staff)
      .where(eq(schema.staff.id, id))
      .limit(1);
    
    return staff || null;
  }

  async createStaff(staff: InsertStaff): Promise<Staff> {
    const [newStaff] = await db.insert(schema.staff)
      .values(staff)
      .returning();
    
    return newStaff;
  }

  async updateStaff(id: string, staff: Partial<InsertStaff>): Promise<Staff> {
    const [updatedStaff] = await db.update(schema.staff)
      .set(staff)
      .where(eq(schema.staff.id, id))
      .returning();
    
    if (!updatedStaff) {
      throw new Error('Staff not found');
    }
    
    return updatedStaff;
  }

  async deleteStaff(id: string): Promise<void> {
    await db.delete(schema.staff)
      .where(eq(schema.staff.id, id));
  }

  async getSyncConfigs(): Promise<SyncConfig[]> {
    return await db.select()
      .from(schema.syncConfig)
      .orderBy(desc(schema.syncConfig.createdAt));
  }

  async getSyncConfigById(id: string): Promise<SyncConfig | null> {
    const [config] = await db.select()
      .from(schema.syncConfig)
      .where(eq(schema.syncConfig.id, id))
      .limit(1);
    
    return config || null;
  }

  async createSyncConfig(config: InsertSyncConfig): Promise<SyncConfig> {
    const [newConfig] = await db.insert(schema.syncConfig)
      .values(config)
      .returning();
    
    return newConfig;
  }

  async updateSyncConfig(id: string, config: Partial<InsertSyncConfig>): Promise<SyncConfig> {
    const [updatedConfig] = await db.update(schema.syncConfig)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(schema.syncConfig.id, id))
      .returning();
    
    if (!updatedConfig) {
      throw new Error('Sync config not found');
    }
    
    return updatedConfig;
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const thisMonth = startOfMonth(new Date());
    const lastMonth = subDays(thisMonth, 30);

    const [
      [{ totalDonations }],
      [{ activeSubscribers }],
      [{ thisMonthAmount }],
      [{ avgDonation }]
    ] = await Promise.all([
      db.select({ totalDonations: sum(schema.transactions.amount) })
        .from(schema.transactions)
        .where(eq(schema.transactions.status, 'SETTLED')),
      
      db.select({ activeSubscribers: count() })
        .from(schema.customers)
        .where(eq(schema.customers.customerType, 'active-subscriber')),
      
      db.select({ thisMonthAmount: sum(schema.transactions.amount) })
        .from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.status, 'SETTLED'),
            gte(schema.transactions.createdAt, thisMonth)
          )
        ),
      
      db.select({ 
        avgDonation: sql<number>`COALESCE(AVG(${schema.transactions.amount}), 0)` 
      })
        .from(schema.transactions)
        .where(eq(schema.transactions.status, 'SETTLED'))
    ]);

    return {
      totalDonations: Number(totalDonations) || 0,
      activeSubscribers: Number(activeSubscribers) || 0,
      thisMonth: Number(thisMonthAmount) || 0,
      avgDonation: Number(avgDonation) || 0
    };
  }
}

export const storage = new DatabaseStorage();