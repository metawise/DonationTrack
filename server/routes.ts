import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./storage";
import { createTransactionSchema, insertCustomerSchema, insertTransactionSchema, insertStaffSchema } from "@shared/schema";
import { myWellSync } from "./services/mywell-sync";
import { sendAuthEmail } from "./services/email";
import { randomUUID } from "crypto";
import { z } from "zod";

// Extend Express Request type for session
declare module "express-session" {
  interface SessionData {
    otp?: string;
    email?: string;
    otpExpires?: number;
    userId?: string;
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  const PgSession = ConnectPgSimple(session);
  app.use(session({
    store: new PgSession({
      pool: pool,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-development',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));
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
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const consolidated = req.query.consolidated === 'true';
      
      const result = consolidated 
        ? await storage.getConsolidatedCustomers(page, limit)
        : await storage.getAllCustomers(page, limit);
      
      res.json(result);
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
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      const result = await storage.getAllTransactions(page, limit);
      res.json(result);
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
      const customer = transaction.customerId ? await storage.getCustomer(transaction.customerId) : null;
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
        currency: 'USD',
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

  // Authentication endpoints
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { email } = req.body;
      
      // Validate email format
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: "Invalid email address" });
      }
      
      // Check if email belongs to staff member
      const staffMember = await storage.getStaffByEmail(email);
      if (!staffMember) {
        return res.status(404).json({ error: "Email not found in staff directory" });
      }
      
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP in session
      req.session.otp = otp;
      req.session.email = email;
      req.session.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
      
      // Force session save
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
          // Send email with OTP
      try {
        await sendAuthEmail(email, otp, staffMember.firstName);
        res.json({ 
          message: "Verification code sent successfully",
          email: email
        });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        res.status(500).json({ error: "Failed to send verification email" });
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({ error: "Failed to send verification code" });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, code } = req.body;
      
      console.log('🔍 Verify OTP Debug:', {
        sessionExists: !!req.session,
        sessionOtp: req.session?.otp,
        sessionEmail: req.session?.email,
        inputEmail: email,
        inputCode: code,
        otpExpires: req.session?.otpExpires,
        currentTime: Date.now()
      });
      
      if (!req.session || !req.session.otp || !req.session.email) {
        console.log('❌ No session data found');
        return res.status(400).json({ error: "No verification session found" });
      }
      
      // Check if OTP expired
      if (Date.now() > (req.session.otpExpires || 0)) {
        console.log('❌ OTP expired');
        delete req.session.otp;
        delete req.session.email;
        delete req.session.otpExpires;
        return res.status(400).json({ error: "Verification code has expired" });
      }
      
      // Check if email matches and OTP is correct
      if (req.session.email !== email || req.session.otp !== code) {
        console.log('❌ OTP mismatch:', {
          emailMatch: req.session.email === email,
          otpMatch: req.session.otp === code,
          expectedOtp: req.session.otp,
          receivedOtp: code
        });
        return res.status(400).json({ error: "Invalid verification code" });
      }
      
      // Get staff member details
      const staffMember = await storage.getStaffByEmail(email);
      if (!staffMember) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      
      // Clean up OTP from session
      delete req.session.otp;
      delete req.session.otpExpires;
      
      // Set authenticated user in session
      req.session.userId = staffMember.id;
      req.session.user = {
        id: staffMember.id,
        firstName: staffMember.firstName,
        lastName: staffMember.lastName,
        email: staffMember.email,
        role: staffMember.role
      };
      
      console.log('✅ Login successful for:', staffMember.firstName, staffMember.lastName);
      
      // Force session save
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      res.json({
        message: "Login successful",
        user: req.session.user,
        token: "session-based"
      });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ error: "Failed to verify code" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            return res.status(500).json({ error: "Failed to logout" });
          }
          res.json({ message: "Logged out successfully" });
        });
      } else {
        res.json({ message: "Already logged out" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to logout" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      res.json({ user: req.session.user });
    } catch (error) {
      res.status(500).json({ error: "Failed to get user info" });
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
      // Convert hireDate string to Date object if needed
      const requestData = {
        ...req.body,
        hireDate: req.body.hireDate ? new Date(req.body.hireDate) : new Date()
      };
      
      const staffData = insertStaffSchema.parse(requestData);
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

  // Sync endpoints
  app.post("/api/sync/mywell", async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      const result = await myWellSync.syncTransactions(startDate, endDate);
      
      if (result.success) {
        res.json({
          message: "Sync completed successfully",
          totalSynced: result.totalSynced,
        });
      } else {
        res.status(500).json({
          error: "Sync failed",
          details: result.error,
        });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to start sync" });
    }
  });

  app.get("/api/sync/config", async (req, res) => {
    try {
      const config = await myWellSync.getLastSyncInfo();
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to get sync configuration" });
    }
  });

  app.put("/api/sync/config", async (req, res) => {
    try {
      const { syncFrequencyMinutes } = req.body;
      await myWellSync.updateSyncFrequency(syncFrequencyMinutes);
      res.json({ message: "Sync frequency updated successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update sync configuration" });
    }
  });

  // Email endpoints
  app.post("/api/auth/send-code", async (req, res) => {
    try {
      const { email } = req.body;
      const authCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const sent = await sendAuthEmail(email, authCode);
      
      if (sent) {
        // In a real app, you'd store this code temporarily for verification
        res.json({ message: "Authentication code sent successfully" });
      } else {
        res.status(500).json({ error: "Failed to send authentication code" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to send authentication code" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email } = req.body;
      const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${randomUUID()}`;
      
      const sent = await sendPasswordResetEmail(email, resetLink);
      
      if (sent) {
        res.json({ message: "Password reset link sent successfully" });
      } else {
        res.status(500).json({ error: "Failed to send password reset email" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to send password reset email" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
