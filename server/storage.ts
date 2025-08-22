import { type Customer, type Transaction, type Staff, type SyncConfig, type InsertCustomer, type InsertTransaction, type InsertStaff, type InsertSyncConfig, type TransactionWithCustomer, type DashboardMetrics } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { customers, transactions, staff, syncConfig } from "@shared/schema";
import { eq, desc, count, sum, sql, and, gte } from "drizzle-orm";

export interface IStorage {
  // Customer operations
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  getAllCustomers(): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined>;

  // Transaction operations
  getTransaction(id: string): Promise<Transaction | undefined>;
  getAllTransactions(): Promise<TransactionWithCustomer[]>;
  getTransactionsByCustomer(customerId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;

  // Staff operations
  getStaff(id: string): Promise<Staff | undefined>;
  getStaffByEmail(email: string): Promise<Staff | undefined>;
  getAllStaff(): Promise<Staff[]>;
  createStaff(staff: InsertStaff): Promise<Staff>;
  updateStaff(id: string, updates: Partial<Staff>): Promise<Staff | undefined>;
  deleteStaff(id: string): Promise<boolean>;

  // Dashboard metrics
  getDashboardMetrics(): Promise<DashboardMetrics>;

  // Sync configuration operations
  getSyncConfig(name: string): Promise<SyncConfig | undefined>;
  createOrUpdateSyncConfig(config: InsertSyncConfig): Promise<SyncConfig>;
}

// Database Storage implementation
export class DatabaseStorage implements IStorage {
  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    return customer || undefined;
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.email, email)).limit(1);
    return customer || undefined;
  }

  async getCustomerByExternalId(externalId: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.externalCustomerId, externalId)).limit(1);
    return customer || undefined;
  }

  async getAllCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(insertCustomer).returning();
    return customer;
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined> {
    const [customer] = await db
      .update(customers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return customer || undefined;
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
    return transaction || undefined;
  }

  async getAllTransactions(): Promise<TransactionWithCustomer[]> {
    const results = await db
      .select()
      .from(transactions)
      .leftJoin(customers, eq(transactions.customerId, customers.id))
      .orderBy(desc(transactions.createdAt));

    return results.map(row => ({
      ...row.transactions,
      customer: row.customers || {
        id: '',
        externalCustomerId: row.transactions.externalCustomerId,
        firstName: 'Unknown',
        lastName: 'Customer',
        email: null,
        phone: null,
        street1: null,
        street2: null,
        city: null,
        state: null,
        postalCode: null,
        country: null,
        customerType: 'one-time',
        totalDonated: 0,
        transactionCount: 0,
        lastSyncAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }));
  }

  async getTransactionsByCustomer(customerId: string): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.customerId, customerId)).orderBy(desc(transactions.createdAt));
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(insertTransaction).returning();
    
    // Update customer totals if customer exists
    if (transaction.customerId) {
      const customer = await this.getCustomer(transaction.customerId);
      if (customer) {
        await this.updateCustomer(transaction.customerId, {
          totalDonated: customer.totalDonated + transaction.amount,
          transactionCount: customer.transactionCount + 1,
        });
      }
    }

    return transaction;
  }

  async getStaff(id: string): Promise<Staff | undefined> {
    const [staffMember] = await db.select().from(staff).where(eq(staff.id, id)).limit(1);
    return staffMember || undefined;
  }

  async getStaffByEmail(email: string): Promise<Staff | undefined> {
    const [staffMember] = await db.select().from(staff).where(eq(staff.email, email)).limit(1);
    return staffMember || undefined;
  }

  async getAllStaff(): Promise<Staff[]> {
    return await db.select().from(staff).orderBy(staff.lastName);
  }

  async createStaff(insertStaff: InsertStaff): Promise<Staff> {
    const [staffMember] = await db.insert(staff).values(insertStaff).returning();
    return staffMember;
  }

  async updateStaff(id: string, updates: Partial<Staff>): Promise<Staff | undefined> {
    const [staffMember] = await db
      .update(staff)
      .set(updates)
      .where(eq(staff.id, id))
      .returning();
    return staffMember || undefined;
  }

  async deleteStaff(id: string): Promise<boolean> {
    const result = await db.delete(staff).where(eq(staff.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    // Get total donations (sum of all transaction amounts)
    const [totalResult] = await db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(eq(transactions.status, 'SETTLED'));
    
    // Get active subscribers count (customers with subscription transactions)
    const [subscribersResult] = await db
      .select({ count: count() })
      .from(customers)
      .where(eq(customers.customerType, 'active-subscriber'));

    // Get this month's donations
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);
    
    const [monthResult] = await db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(
        eq(transactions.status, 'SETTLED'),
        gte(transactions.createdAt, firstOfMonth)
      ));

    // Get transaction count for average calculation
    const [avgResult] = await db
      .select({ 
        count: count(), 
        total: sum(transactions.amount) 
      })
      .from(transactions)
      .where(eq(transactions.status, 'SETTLED'));

    const totalDonations = Number(totalResult?.total || 0) / 100; // Convert from cents
    const activeSubscribers = subscribersResult?.count || 0;
    const thisMonth = Number(monthResult?.total || 0) / 100; // Convert from cents
    const avgDonation = avgResult?.count > 0 ? Number(avgResult.total || 0) / avgResult.count / 100 : 0;

    return {
      totalDonations,
      activeSubscribers,
      thisMonth,
      avgDonation,
    };
  }

  async getSyncConfig(name: string): Promise<SyncConfig | undefined> {
    const [config] = await db.select().from(syncConfig).where(eq(syncConfig.name, name)).limit(1);
    return config || undefined;
  }

  async createOrUpdateSyncConfig(insertConfig: InsertSyncConfig): Promise<SyncConfig> {
    const [config] = await db
      .insert(syncConfig)
      .values(insertConfig)
      .onConflictDoUpdate({
        target: syncConfig.name,
        set: {
          ...insertConfig,
          updatedAt: new Date(),
        }
      })
      .returning();
    return config;
  }
}

// Simplified stub for testing
export class MemStorage implements IStorage {
  async getCustomer(id: string): Promise<Customer | undefined> { return undefined; }
  async getCustomerByEmail(email: string): Promise<Customer | undefined> { return undefined; }
  async getAllCustomers(): Promise<Customer[]> { return []; }
  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    return { 
      id: randomUUID(),
      externalCustomerId: 'test-ext-id',
      ...customer,
      customerType: 'one-time',
      totalDonated: 0,
      transactionCount: 0,
      lastSyncAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined> { return undefined; }
  
  async getTransaction(id: string): Promise<Transaction | undefined> { return undefined; }
  async getAllTransactions(): Promise<TransactionWithCustomer[]> { return []; }
  async getTransactionsByCustomer(customerId: string): Promise<Transaction[]> { return []; }
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    return {
      id: randomUUID(),
      externalCustomerId: 'test-ext-id',
      customerId: null,
      ...transaction,
      syncedAt: new Date(),
    };
  }

  async getStaff(id: string): Promise<Staff | undefined> { return undefined; }
  async getStaffByEmail(email: string): Promise<Staff | undefined> { return undefined; }
  async getAllStaff(): Promise<Staff[]> { return []; }
  async createStaff(staff: InsertStaff): Promise<Staff> {
    return { 
      id: randomUUID(),
      ...staff,
      role: staff.role || 'staff',
      status: staff.status || 'active',
      hireDate: staff.hireDate || new Date(),
      createdAt: new Date(),
    };
  }
  async updateStaff(id: string, updates: Partial<Staff>): Promise<Staff | undefined> { return undefined; }
  async deleteStaff(id: string): Promise<boolean> { return false; }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return { totalDonations: 0, activeSubscribers: 0, thisMonth: 0, avgDonation: 0 };
  }

  async getSyncConfig(name: string): Promise<SyncConfig | undefined> { return undefined; }
  async createOrUpdateSyncConfig(config: InsertSyncConfig): Promise<SyncConfig> {
    return { 
      id: randomUUID(),
      ...config,
      isActive: config.isActive ?? true,
      syncFrequencyMinutes: config.syncFrequencyMinutes ?? 60,
      totalRecordsSynced: config.totalRecordsSynced ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

// Use database storage by default, but keep MemStorage for testing
export const storage = process.env.NODE_ENV === 'test' ? new MemStorage() : new DatabaseStorage();