import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// MyWell API Customer data - stores basic info, references external customerId
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalCustomerId: text("external_customer_id").notNull().unique(), // MyWell customerId
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  street1: text("street1"),
  street2: text("street2"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country"),
  customerType: text("customer_type").notNull().default("one-time"), // "one-time", "active-subscriber", "inactive"
  totalDonated: integer("total_donated").notNull().default(0),
  transactionCount: integer("transaction_count").notNull().default(0),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  externalCustomerIdIdx: index("customer_external_id_idx").on(table.externalCustomerId),
}));

// MyWell API Transaction data - mirrors API structure
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey(), // Use MyWell transaction ID directly
  externalCustomerId: text("external_customer_id").notNull(),
  customerId: varchar("customer_id").references(() => customers.id),
  type: text("type").notNull(), // "SALE", etc from MyWell
  kind: text("kind").notNull(), // "DONATION", etc from MyWell
  amount: integer("amount").notNull(), // Amount in cents from MyWell
  emailAddress: text("email_address"),
  paymentMethod: text("payment_method"),
  responseBody: jsonb("response_body"), // Full payment method details from MyWell
  status: text("status").notNull(), // "SETTLED", "PENDING", etc from MyWell
  responseCode: integer("response_code"),
  responseMessage: text("response_message"),
  subscriptionId: text("subscription_id"),
  settlementBatchId: text("settlement_batch_id"),
  billingAddress: jsonb("billing_address"), // Address object from MyWell
  shippingAddress: jsonb("shipping_address"), // Address object from MyWell
  ipAddress: text("ip_address"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  settledAt: timestamp("settled_at"),
  piUpdatedAt: timestamp("pi_updated_at"), // MyWell's piUpdatedAt field
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
}, (table) => ({
  customerIdIdx: index("transaction_customer_id_idx").on(table.externalCustomerId),
  createdAtIdx: index("transaction_created_at_idx").on(table.createdAt),
  statusIdx: index("transaction_status_idx").on(table.status),
}));

export const staff = pgTable("staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  role: text("role").notNull().default("staff"), // "admin", "manager", "staff"
  department: text("department"),
  status: text("status").notNull().default("active"), // "active", "inactive"
  hireDate: timestamp("hire_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Sync configuration table - tracks sync settings and status
export const syncConfig = pgTable("sync_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // "mywell_transactions"
  isActive: boolean("is_active").notNull().default(true),
  syncFrequencyMinutes: integer("sync_frequency_minutes").notNull().default(60), // Default 1 hour
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncStatus: text("last_sync_status"), // "success", "error", "in_progress"
  lastSyncError: text("last_sync_error"),
  totalRecordsSynced: integer("total_records_synced").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const customersRelations = relations(customers, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  customer: one(customers, {
    fields: [transactions.customerId],
    references: [customers.id],
  }),
}));

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  syncedAt: true,
});

export const insertStaffSchema = createInsertSchema(staff).omit({
  id: true,
  createdAt: true,
});

export const insertSyncConfigSchema = createInsertSchema(syncConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// MyWell API compatible schema
export const createTransactionSchema = z.object({
  type: z.string(),
  kind: z.string(),
  amount: z.number(),
  ipAddress: z.string().optional(),
  emailAddress: z.string().email(),
  billingAddress: z.object({
    firstName: z.string(),
    lastName: z.string(),
    street1: z.string(),
    street2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  paymentMethod: z.object({
    currencyType: z.string(),
    displayName: z.string(),
    token: z.string(),
    customer: z.object({
      id: z.string().optional(),
      billingAddressId: z.string().optional(),
      shippingAddressId: z.string().optional(),
      paymentMethodId: z.string().optional(),
    }).optional(),
  }),
  shippingAddress: z.object({
    firstName: z.string(),
    lastName: z.string(),
    street1: z.string(),
    street2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
  }).optional(),
  description: z.string().optional(),
  clientType: z.string().optional(),
});

export type Customer = typeof customers.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type SyncConfig = typeof syncConfig.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type InsertSyncConfig = z.infer<typeof insertSyncConfigSchema>;
export type CreateTransactionPayload = z.infer<typeof createTransactionSchema>;

// View types for frontend
export type TransactionWithCustomer = Transaction & {
  customer: Customer;
};

export type DashboardMetrics = {
  totalDonations: number;
  activeSubscribers: number;
  thisMonth: number;
  avgDonation: number;
};
