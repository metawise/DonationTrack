import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createTransactionSchema, insertCustomerSchema, insertTransactionSchema, insertStaffSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard metrics endpoint
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard metrics" });
    }
  });

  // Customers endpoints
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  app.get("/api/customers/:id/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactionsByCustomer(req.params.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer transactions" });
    }
  });

  // Transactions endpoints
  app.get("/api/transactions", async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.get("/api/transactions/:id", async (req, res) => {
    try {
      const transaction = await storage.getTransaction(req.params.id);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      const customer = await storage.getCustomer(transaction.customerId);
      res.json({ ...transaction, customer });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transaction" });
    }
  });

  // MyWell-compatible transaction creation endpoint
  app.post("/api/v1/transaction", async (req, res) => {
    try {
      const payload = createTransactionSchema.parse(req.body);
      
      // Find or create customer
      let customer = await storage.getCustomerByEmail(payload.emailAddress);
      
      if (!customer) {
        const newCustomer = insertCustomerSchema.parse({
          firstName: payload.billingAddress.firstName,
          lastName: payload.billingAddress.lastName,
          email: payload.emailAddress,
          phone: payload.billingAddress.phone || null,
          street1: payload.billingAddress.street1,
          street2: payload.billingAddress.street2 || null,
          city: payload.billingAddress.city,
          state: payload.billingAddress.state,
          postalCode: payload.billingAddress.postalCode,
          country: payload.billingAddress.country,
          customerType: payload.type === "monthly" ? "active-subscriber" : "one-time",
          totalDonated: 0,
          transactionCount: 0,
        });
        
        customer = await storage.createCustomer(newCustomer);
      }

      // Create transaction
      const newTransaction = insertTransactionSchema.parse({
        customerId: customer.id,
        type: payload.type,
        kind: payload.kind,
        amount: Math.round(payload.amount * 100), // Convert to cents
        currency: payload.paymentMethod.currencyType,
        status: "completed",
        designation: null,
        description: payload.description || `${payload.type} donation`,
        ipAddress: payload.ipAddress || null,
        paymentMethodType: "credit-card",
        paymentMethodLast4: "****", // Don't store real payment data
        paymentMethodExpires: null,
        clientType: payload.clientType || "manual",
      });

      const transaction = await storage.createTransaction(newTransaction);

      res.status(201).json({
        id: transaction.id,
        status: transaction.status,
        amount: transaction.amount / 100, // Convert back to dollars for response
        currency: transaction.currency,
        createdAt: transaction.createdAt,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create transaction" });
      }
    }
  });

  // Mock refund endpoint
  app.post("/api/transactions/:id/refund", async (req, res) => {
    try {
      const transaction = await storage.getTransaction(req.params.id);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      
      // In a real implementation, this would process the refund
      res.json({ 
        message: "Refund processed successfully",
        refundId: `REF-${Date.now()}`,
        amount: transaction.amount / 100
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to process refund" });
    }
  });

  // Staff endpoints
  app.get("/api/staff", async (req, res) => {
    try {
      const staff = await storage.getAllStaff();
      res.json(staff);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch staff" });
    }
  });

  app.get("/api/staff/:id", async (req, res) => {
    try {
      const staff = await storage.getStaff(req.params.id);
      if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      res.json(staff);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch staff member" });
    }
  });

  app.post("/api/staff", async (req, res) => {
    try {
      const staffData = insertStaffSchema.parse(req.body);
      const staff = await storage.createStaff(staffData);
      res.status(201).json(staff);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid staff data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create staff member" });
      }
    }
  });

  app.put("/api/staff/:id", async (req, res) => {
    try {
      const updates = req.body;
      const staff = await storage.updateStaff(req.params.id, updates);
      if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      res.json(staff);
    } catch (error) {
      res.status(500).json({ error: "Failed to update staff member" });
    }
  });

  app.delete("/api/staff/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteStaff(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      res.json({ message: "Staff member deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete staff member" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
