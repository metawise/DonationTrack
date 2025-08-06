import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createTransactionSchema, insertCustomerSchema, insertTransactionSchema, insertStaffSchema, loginRequestSchema, verifyCodeSchema } from "@shared/schema";
import { z } from "zod";
import { emailService } from "./email-service";
import { requireAuth, requireRole } from "./auth-middleware";
import { randomUUID } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Helper function to generate verification code
  const generateVerificationCode = (): string => {
    return Math.random().toString().slice(2, 8).padStart(6, '0');
  };

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email } = loginRequestSchema.parse(req.body);
      
      // Check if staff exists and is active
      const staff = await storage.getStaffByEmail(email);
      if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      
      if (staff.status !== 'active') {
        return res.status(403).json({ error: "Account is not active" });
      }
      
      // Generate verification code
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      await storage.createVerificationCode({
        email,
        code,
        expiresAt,
      });
      
      // Send verification code via dummy email service
      await emailService.sendVerificationCode(email, code);
      
      res.json({ 
        message: "Verification code sent to your email",
        email: email // Return email for UI feedback
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid email address", details: error.errors });
      } else {
        console.error('Login error:', error);
        res.status(500).json({ error: "Failed to send verification code" });
      }
    }
  });

  app.post("/api/auth/verify", async (req, res) => {
    try {
      const { email, code } = verifyCodeSchema.parse(req.body);
      
      // Find and validate verification code
      const verificationCode = await storage.getVerificationCode(email, code);
      if (!verificationCode) {
        return res.status(400).json({ error: "Invalid or expired verification code" });
      }
      
      // Get staff member
      const staff = await storage.getStaffByEmail(email);
      if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      
      // Mark code as used
      await storage.markCodeAsUsed(verificationCode.id);
      
      // Create session
      const sessionToken = randomUUID();
      const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      await storage.createAuthSession({
        staffId: staff.id,
        token: sessionToken,
        expiresAt: sessionExpiresAt,
      });
      
      res.json({
        token: sessionToken,
        expiresAt: sessionExpiresAt,
        staff: {
          id: staff.id,
          firstName: staff.firstName,
          lastName: staff.lastName,
          email: staff.email,
          role: staff.role,
          department: staff.department,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request", details: error.errors });
      } else {
        console.error('Verification error:', error);
        res.status(500).json({ error: "Failed to verify code" });
      }
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        await storage.deleteAuthSession(token);
      }
      
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: "Failed to logout" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      res.json({
        id: req.staff!.id,
        firstName: req.staff!.firstName,
        lastName: req.staff!.lastName,
        email: req.staff!.email,
        role: req.staff!.role,
        department: req.staff!.department,
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: "Failed to get user info" });
    }
  });

  // Dashboard metrics endpoint (protected)
  app.get("/api/dashboard/metrics", requireAuth, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard metrics" });
    }
  });

  // Customers endpoints (protected)
  app.get("/api/customers", requireAuth, async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", requireAuth, async (req, res) => {
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

  app.get("/api/customers/:id/transactions", requireAuth, async (req, res) => {
    try {
      const transactions = await storage.getTransactionsByCustomer(req.params.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer transactions" });
    }
  });

  // Transactions endpoints (protected)
  app.get("/api/transactions", requireAuth, async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.get("/api/transactions/:id", requireAuth, async (req, res) => {
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

  // MyWell-compatible transaction creation endpoint (protected)
  app.post("/api/v1/transaction", requireAuth, async (req, res) => {
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

  // Mock refund endpoint (protected)
  app.post("/api/transactions/:id/refund", requireAuth, async (req, res) => {
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

  // Staff endpoints (protected, admin/manager only for modifications)
  app.get("/api/staff", requireAuth, async (req, res) => {
    try {
      const staff = await storage.getAllStaff();
      res.json(staff);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch staff" });
    }
  });

  app.get("/api/staff/:id", requireAuth, async (req, res) => {
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

  app.post("/api/staff", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
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

  app.put("/api/staff/:id", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
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

  app.delete("/api/staff/:id", requireAuth, requireRole(['admin', 'manager']), async (req, res) => {
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
