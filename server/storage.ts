import { type Customer, type Transaction, type Staff, type SyncConfig, type InsertCustomer, type InsertTransaction, type InsertStaff, type InsertSyncConfig, type TransactionWithCustomer, type DashboardMetrics } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { customers, transactions, staff, syncConfig } from "@shared/schema";
import { eq, desc, count, sum, sql, and, gte } from "drizzle-orm";

export interface IStorage {
  // Customer operations
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  getAllCustomers(page?: number, limit?: number): Promise<{ customers: Customer[]; total: number }>;
  getConsolidatedCustomers(page?: number, limit?: number): Promise<{ customers: Customer[]; total: number }>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined>;
  findOrCreateCustomer(customerData: InsertCustomer): Promise<Customer>;

  // Transaction operations
  getTransaction(id: string): Promise<Transaction | undefined>;
  getAllTransactions(page?: number, limit?: number): Promise<{ transactions: TransactionWithCustomer[]; total: number }>;
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

  async getAllCustomers(page?: number, limit?: number): Promise<{ customers: Customer[]; total: number }> {
    const query = db.select().from(customers).orderBy(desc(customers.createdAt));
    
    if (page && limit) {
      const offset = (page - 1) * limit;
      const customersResult = await query.limit(limit).offset(offset);
      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(customers);
      return { customers: customersResult, total: Number(count) };
    }
    
    const customersResult = await query;
    return { customers: customersResult, total: customersResult.length };
  }

  async getConsolidatedCustomers(page?: number, limit?: number): Promise<{ customers: any[]; total: number }> {
    // Get consolidated customers with separate one-time and recurring donation rows
    const consolidatedQuery = db
      .select({
        id: sql<string>`MIN(c."id")`,
        externalCustomerId: sql<string>`STRING_AGG(DISTINCT c."external_customer_id", ',')`,
        firstName: sql<string>`MIN(c."first_name")`,
        lastName: sql<string>`MIN(c."last_name")`,
        email: sql<string>`MIN(c."email")`,
        phone: sql<string>`MIN(c."phone")`,
        street1: sql<string>`MIN(c."street1")`,
        street2: sql<string>`MIN(c."street2")`,
        city: sql<string>`MIN(c."city")`,
        state: sql<string>`MIN(c."state")`,
        postalCode: sql<string>`MIN(c."postal_code")`,
        country: sql<string>`MIN(c."country")`,
        // One-time donations (no subscription_id)
        oneTimeTotal: sql<number>`COALESCE(SUM(CASE WHEN t."subscription_id" IS NULL THEN t."amount" ELSE 0 END), 0)`,
        oneTimeCount: sql<number>`COUNT(CASE WHEN t."subscription_id" IS NULL THEN t."id" END)`,
        // Recurring donations (with subscription_id)
        recurringTotal: sql<number>`COALESCE(SUM(CASE WHEN t."subscription_id" IS NOT NULL THEN t."amount" ELSE 0 END), 0)`,
        recurringCount: sql<number>`COUNT(CASE WHEN t."subscription_id" IS NOT NULL THEN t."id" END)`,
        lastSyncAt: sql<Date | null>`MAX(c."last_sync_at")`,
        createdAt: sql<Date>`MIN(c."created_at")`,
        updatedAt: sql<Date>`MAX(c."updated_at")`,
      })
      .from(customers.as('c'))
      .leftJoin(transactions.as('t'), eq(sql`c."id"`, sql`t."customer_id"`))
      .groupBy(
        sql`COALESCE(c."email", 'no-email-' || c."first_name" || '-' || c."last_name")`
      )
      .orderBy(desc(sql`MAX(c."updated_at")`));

    if (page && limit) {
      const offset = (page - 1) * limit;
      const customersResult = await consolidatedQuery.limit(limit).offset(offset);
      
      // Get total count of consolidated customers
      const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(
          db
            .select({ groupKey: sql`COALESCE("email", 'no-email-' || "first_name" || '-' || "last_name")` })
            .from(customers)
            .groupBy(sql`COALESCE("email", 'no-email-' || "first_name" || '-' || "last_name")`)
            .as('grouped')
        );
      
      const [{ count }] = await countQuery;
      
      // Transform results to create separate rows for one-time and recurring
      const expandedResults = [];
      for (const customer of customersResult) {
        if (customer.oneTimeCount > 0) {
          expandedResults.push({
            ...customer,
            customerType: 'one-time',
            totalDonated: customer.oneTimeTotal,
            transactionCount: customer.oneTimeCount,
            rowId: `${customer.id}-onetime`
          });
        }
        if (customer.recurringCount > 0) {
          expandedResults.push({
            ...customer,
            customerType: 'recurring',
            totalDonated: customer.recurringTotal,
            transactionCount: customer.recurringCount,
            rowId: `${customer.id}-recurring`
          });
        }
        if (customer.oneTimeCount === 0 && customer.recurringCount === 0) {
          expandedResults.push({
            ...customer,
            customerType: 'one-time',
            totalDonated: 0,
            transactionCount: 0,
            rowId: customer.id
          });
        }
      }
      
      return { customers: expandedResults, total: Number(count) };
    }
    
    const customersResult = await consolidatedQuery;
    const expandedResults = [];
    for (const customer of customersResult) {
      if (customer.oneTimeCount > 0) {
        expandedResults.push({
          ...customer,
          customerType: 'one-time',
          totalDonated: customer.oneTimeTotal,
          transactionCount: customer.oneTimeCount,
          rowId: `${customer.id}-onetime`
        });
      }
      if (customer.recurringCount > 0) {
        expandedResults.push({
          ...customer,
          customerType: 'recurring',
          totalDonated: customer.recurringTotal,
          transactionCount: customer.recurringCount,
          rowId: `${customer.id}-recurring`
        });
      }
      if (customer.oneTimeCount === 0 && customer.recurringCount === 0) {
        expandedResults.push({
          ...customer,
          customerType: 'one-time',
          totalDonated: 0,
          transactionCount: 0,
          rowId: customer.id
        });
      }
    }
    
    return { customers: expandedResults, total: expandedResults.length };
  }

  async findOrCreateCustomer(customerData: InsertCustomer): Promise<Customer> {
    // Try to find existing customer by email first, then by name if no email
    let existingCustomer: Customer | undefined;
    
    if (customerData.email) {
      existingCustomer = await this.getCustomerByEmail(customerData.email);
    } else if (customerData.firstName && customerData.lastName) {
      // Find by name if no email
      const [customer] = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.firstName, customerData.firstName),
            eq(customers.lastName, customerData.lastName),
            sql`${customers.email} IS NULL`
          )
        )
        .limit(1);
      existingCustomer = customer;
    }

    if (existingCustomer) {
      // Update existing customer with any new information
      const updateData: Partial<Customer> = {};
      
      if (customerData.phone && !existingCustomer.phone) updateData.phone = customerData.phone;
      if (customerData.street1 && !existingCustomer.street1) updateData.street1 = customerData.street1;
      if (customerData.street2 && !existingCustomer.street2) updateData.street2 = customerData.street2;
      if (customerData.city && !existingCustomer.city) updateData.city = customerData.city;
      if (customerData.state && !existingCustomer.state) updateData.state = customerData.state;
      if (customerData.postalCode && !existingCustomer.postalCode) updateData.postalCode = customerData.postalCode;
      if (customerData.country && !existingCustomer.country) updateData.country = customerData.country;
      
      updateData.lastSyncAt = new Date();

      if (Object.keys(updateData).length > 0) {
        const updatedCustomer = await this.updateCustomer(existingCustomer.id, updateData);
        return updatedCustomer || existingCustomer;
      }

      return existingCustomer;
    }

    // Create new customer
    return await this.createCustomer(customerData);
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

  async getAllTransactions(page?: number, limit?: number): Promise<{ transactions: TransactionWithCustomer[]; total: number }> {
    const query = db
      .select()
      .from(transactions)
      .leftJoin(customers, eq(transactions.customerId, customers.id))
      .orderBy(desc(transactions.createdAt));

    if (page && limit) {
      const offset = (page - 1) * limit;
      const results = await query.limit(limit).offset(offset);
      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(transactions);
      
      const mappedResults = results.map(row => ({
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
      
      return { transactions: mappedResults, total: Number(count) };
    }

    const results = await query;
    const mappedResults = results.map(row => ({
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
    
    return { transactions: mappedResults, total: mappedResults.length };
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
    
    // Get consolidated active subscribers count (customers with multiple records = recurring)
    const [subscribersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(
        db
          .select({ groupKey: sql`COALESCE("email", 'no-email-' || "first_name" || '-' || "last_name")` })
          .from(customers)
          .groupBy(sql`COALESCE("email", 'no-email-' || "first_name" || '-' || "last_name")`)
          .having(sql`COUNT(*) > 1`)
          .as('recurring_customers')
      );

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

// Always use database storage
export const storage = new DatabaseStorage();