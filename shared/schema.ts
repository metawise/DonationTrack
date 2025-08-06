import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => customers.id).notNull(),
  type: text("type").notNull(), // "one-time", "monthly"
  kind: text("kind").notNull().default("donation"),
  amount: integer("amount").notNull(), // Amount in cents
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("completed"), // "completed", "pending", "failed"
  designation: text("designation"),
  description: text("description"),
  ipAddress: text("ip_address"),
  paymentMethodType: text("payment_method_type").notNull().default("credit-card"), // "credit-card", "bank"
  paymentMethodLast4: text("payment_method_last4"),
  paymentMethodExpires: text("payment_method_expires"),
  clientType: text("client_type").notNull().default("manual"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
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
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
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
