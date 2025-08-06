import { type Customer, type Transaction, type Staff, type InsertCustomer, type InsertTransaction, type InsertStaff, type TransactionWithCustomer, type DashboardMetrics } from "@shared/schema";
import { randomUUID } from "crypto";

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
}

export class MemStorage implements IStorage {
  private customers: Map<string, Customer>;
  private transactions: Map<string, Transaction>;
  private staff: Map<string, Staff>;

  constructor() {
    this.customers = new Map();
    this.transactions = new Map();
    this.staff = new Map();
    this.seedData();
  }

  private seedData() {
    // Seed customers
    const sampleCustomers: Customer[] = [
      {
        id: "cust-001",
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah.johnson@email.com",
        phone: "(555) 123-4567",
        street1: "123 Main Street",
        street2: null,
        city: "New York",
        state: "NY",
        postalCode: "10001",
        country: "US",
        customerType: "active-subscriber",
        totalDonated: 187500, // $1,875.00
        transactionCount: 15,
        createdAt: new Date("2023-06-15T10:30:00Z"),
      },
      {
        id: "cust-002",
        firstName: "Michael",
        lastName: "Chen",
        email: "m.chen@email.com",
        phone: "(555) 987-6543",
        street1: "456 Oak Avenue",
        street2: null,
        city: "Los Angeles",
        state: "CA",
        postalCode: "90210",
        country: "US",
        customerType: "one-time",
        totalDonated: 45000, // $450.00
        transactionCount: 3,
        createdAt: new Date("2023-08-22T14:15:00Z"),
      },
      {
        id: "cust-003",
        firstName: "Emma",
        lastName: "Rodriguez",
        email: "emma.r@email.com",
        phone: "(555) 456-7890",
        street1: "789 Pine Street",
        street2: null,
        city: "Houston",
        state: "TX",
        postalCode: "77001",
        country: "US",
        customerType: "active-subscriber",
        totalDonated: 240000, // $2,400.00
        transactionCount: 12,
        createdAt: new Date("2023-03-10T09:45:00Z"),
      }
    ];

    sampleCustomers.forEach(customer => {
      this.customers.set(customer.id, customer);
    });

    // Seed transactions
    const sampleTransactions: Transaction[] = [
      {
        id: "txn-001",
        customerId: "cust-001",
        type: "monthly",
        kind: "donation",
        amount: 12500, // $125.00
        currency: "USD",
        status: "completed",
        designation: "general",
        description: "Monthly donation - General Fund",
        ipAddress: "192.168.1.1",
        paymentMethodType: "credit-card",
        paymentMethodLast4: "4242",
        paymentMethodExpires: "12/25",
        clientType: "online",
        createdAt: new Date("2024-01-15T14:30:00Z"),
      },
      {
        id: "txn-002",
        customerId: "cust-002",
        type: "one-time",
        kind: "donation",
        amount: 5000, // $50.00
        currency: "USD",
        status: "completed",
        designation: "missions",
        description: "One-time donation - Missions",
        ipAddress: "192.168.1.2",
        paymentMethodType: "credit-card",
        paymentMethodLast4: "1234",
        paymentMethodExpires: "08/26",
        clientType: "online",
        createdAt: new Date("2024-01-14T11:45:00Z"),
      },
      {
        id: "txn-003",
        customerId: "cust-003",
        type: "monthly",
        kind: "donation",
        amount: 20000, // $200.00
        currency: "USD",
        status: "completed",
        designation: "general",
        description: "Monthly donation - General Fund",
        ipAddress: "192.168.1.3",
        paymentMethodType: "credit-card",
        paymentMethodLast4: "5678",
        paymentMethodExpires: "03/27",
        clientType: "online",
        createdAt: new Date("2024-01-13T09:15:00Z"),
      }
    ];

    sampleTransactions.forEach(transaction => {
      this.transactions.set(transaction.id, transaction);
    });

    // Seed staff
    const sampleStaff: Staff[] = [
      {
        id: "staff-001",
        firstName: "John",
        lastName: "Smith",
        email: "john.smith@jewsforjesus.org",
        phone: "(555) 111-2222",
        role: "admin",
        department: "Administration",
        status: "active",
        hireDate: new Date("2020-01-15T09:00:00Z"),
        createdAt: new Date("2020-01-15T09:00:00Z"),
      },
      {
        id: "staff-002",
        firstName: "Maria",
        lastName: "Garcia",
        email: "maria.garcia@jewsforjesus.org",
        phone: "(555) 333-4444",
        role: "manager",
        department: "Development",
        status: "active",
        hireDate: new Date("2021-03-20T09:00:00Z"),
        createdAt: new Date("2021-03-20T09:00:00Z"),
      },
      {
        id: "staff-003",
        firstName: "David",
        lastName: "Wilson",
        email: "david.wilson@jewsforjesus.org",
        phone: "(555) 555-6666",
        role: "staff",
        department: "Outreach",
        status: "active",
        hireDate: new Date("2022-06-10T09:00:00Z"),
        createdAt: new Date("2022-06-10T09:00:00Z"),
      },
      {
        id: "staff-004",
        firstName: "Lisa",
        lastName: "Chen",
        email: "lisa.chen@jewsforjesus.org",
        phone: "(555) 777-8888",
        role: "staff",
        department: "Finance",
        status: "inactive",
        hireDate: new Date("2019-09-05T09:00:00Z"),
        createdAt: new Date("2019-09-05T09:00:00Z"),
      }
    ];

    sampleStaff.forEach(staffMember => {
      this.staff.set(staffMember.id, staffMember);
    });
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(
      customer => customer.email === email
    );
  }

  async getAllCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const customer: Customer = { 
      ...insertCustomer,
      id,
      createdAt: new Date(),
      // Ensure all required fields have proper values
      street1: insertCustomer.street1 || null,
      street2: insertCustomer.street2 || null,
      city: insertCustomer.city || null,
      state: insertCustomer.state || null,
      postalCode: insertCustomer.postalCode || null,
      country: insertCustomer.country || null,
      phone: insertCustomer.phone || null,
      customerType: insertCustomer.customerType || "one-time",
      totalDonated: insertCustomer.totalDonated || 0,
      transactionCount: insertCustomer.transactionCount || 0,
    };
    this.customers.set(id, customer);
    return customer;
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined> {
    const customer = this.customers.get(id);
    if (!customer) return undefined;
    
    const updatedCustomer = { ...customer, ...updates };
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getAllTransactions(): Promise<TransactionWithCustomer[]> {
    const transactions = Array.from(this.transactions.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
    
    return transactions.map(transaction => {
      const customer = this.customers.get(transaction.customerId);
      return {
        ...transaction,
        customer: customer!
      };
    });
  }

  async getTransactionsByCustomer(customerId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(transaction => transaction.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const transaction: Transaction = { 
      ...insertTransaction,
      id,
      createdAt: new Date(),
      // Ensure all required fields have proper values
      kind: insertTransaction.kind || "donation",
      status: insertTransaction.status || "completed",
      currency: insertTransaction.currency || "USD",
      designation: insertTransaction.designation || null,
      description: insertTransaction.description || null,
      ipAddress: insertTransaction.ipAddress || null,
      paymentMethodType: insertTransaction.paymentMethodType || "credit-card",
      paymentMethodLast4: insertTransaction.paymentMethodLast4 || null,
      paymentMethodExpires: insertTransaction.paymentMethodExpires || null,
      clientType: insertTransaction.clientType || "manual",
    };
    this.transactions.set(id, transaction);

    // Update customer totals
    const customer = this.customers.get(insertTransaction.customerId);
    if (customer) {
      const updatedCustomer = {
        ...customer,
        totalDonated: customer.totalDonated + insertTransaction.amount,
        transactionCount: customer.transactionCount + 1,
        customerType: insertTransaction.type === "monthly" ? "active-subscriber" : customer.customerType
      };
      this.customers.set(customer.id, updatedCustomer);
    }

    return transaction;
  }

  // Staff operations
  async getStaff(id: string): Promise<Staff | undefined> {
    return this.staff.get(id);
  }

  async getStaffByEmail(email: string): Promise<Staff | undefined> {
    return Array.from(this.staff.values()).find(
      staff => staff.email === email
    );
  }

  async getAllStaff(): Promise<Staff[]> {
    return Array.from(this.staff.values()).sort((a, b) => 
      a.lastName.localeCompare(b.lastName)
    );
  }

  async createStaff(insertStaff: InsertStaff): Promise<Staff> {
    const id = randomUUID();
    const staff: Staff = { 
      ...insertStaff,
      id,
      createdAt: new Date(),
      // Ensure all required fields have proper values
      phone: insertStaff.phone || null,
      department: insertStaff.department || null,
      role: insertStaff.role || "staff",
      status: insertStaff.status || "active",
      hireDate: insertStaff.hireDate || new Date(),
    };
    this.staff.set(id, staff);
    return staff;
  }

  async updateStaff(id: string, updates: Partial<Staff>): Promise<Staff | undefined> {
    const staff = this.staff.get(id);
    if (!staff) return undefined;
    
    const updatedStaff = { ...staff, ...updates };
    this.staff.set(id, updatedStaff);
    return updatedStaff;
  }

  async deleteStaff(id: string): Promise<boolean> {
    return this.staff.delete(id);
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const transactions = Array.from(this.transactions.values());
    const customers = Array.from(this.customers.values());
    
    const totalDonations = transactions
      .filter(t => t.status === "completed")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const activeSubscribers = customers.filter(c => c.customerType === "active-subscriber").length;
    
    const thisMonth = transactions
      .filter(t => {
        const transactionDate = new Date(t.createdAt);
        const now = new Date();
        return transactionDate.getMonth() === now.getMonth() && 
               transactionDate.getFullYear() === now.getFullYear() &&
               t.status === "completed";
      })
      .reduce((sum, t) => sum + t.amount, 0);
    
    const avgDonation = transactions.length > 0 
      ? Math.round(totalDonations / transactions.filter(t => t.status === "completed").length)
      : 0;

    return {
      totalDonations: Math.round(totalDonations / 100), // Convert cents to dollars
      activeSubscribers,
      thisMonth: Math.round(thisMonth / 100), // Convert cents to dollars
      avgDonation: Math.round(avgDonation / 100) // Convert cents to dollars
    };
  }
}

export const storage = new MemStorage();
