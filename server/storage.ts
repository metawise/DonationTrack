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

  async getConsolidatedCustomers(page?: number, limit?: number): Promise<{ customers: Customer[]; total: number }> {
    // Get consolidated customers by grouping by email and first/last name
    const consolidatedQuery = db
      .select({
        id: sql<string>`MIN("id")`,
        externalCustomerId: sql<string>`STRING_AGG(DISTINCT "external_customer_id", ',')`,
        firstName: sql<string>`MIN("first_name")`,
        lastName: sql<string>`MIN("last_name")`,
        email: sql<string>`MIN("email")`,
        phone: sql<string>`MIN("phone")`,
        street1: sql<string>`MIN("street1")`,
        street2: sql<string>`MIN("street2")`,
        city: sql<string>`MIN("city")`,
        state: sql<string>`MIN("state")`,
        postalCode: sql<string>`MIN("postal_code")`,
        country: sql<string>`MIN("country")`,
        customerType: sql<string>`CASE WHEN COUNT(*) > 1 THEN 'recurring' ELSE MIN("customer_type") END`,
        totalDonated: sql<number>`SUM("total_donated")`,
        transactionCount: sql<number>`SUM("transaction_count")`,
        lastSyncAt: sql<Date | null>`MAX("last_sync_at")`,
        createdAt: sql<Date>`MIN("created_at")`,
        updatedAt: sql<Date>`MAX("updated_at")`,
      })
      .from(customers)
      .groupBy(
        sql`COALESCE("email", 'no-email-' || "first_name" || '-' || "last_name")`
      )
      .orderBy(desc(sql`MAX("updated_at")`));

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
      return { customers: customersResult as Customer[], total: Number(count) };
    }
    
    const customersResult = await consolidatedQuery;
    return { customers: customersResult as Customer[], total: customersResult.length };
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