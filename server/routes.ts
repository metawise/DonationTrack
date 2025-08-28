import { Router } from 'express';
import { storage } from './storage';
import { insertCustomerSchema, insertTransactionSchema, insertStaffSchema, insertSyncConfigSchema } from '@shared/schema';
import { fromError } from 'zod-validation-error';

const router = Router();

// Authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
};

// Auth routes
router.post('/auth/login', (req, res, next) => {
  const passport = require('passport');
  passport.authenticate('local', (err: any, user: any) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    req.logIn(user, (err: any) => {
      if (err) return next(err);
      res.json({ user, message: 'Login successful' });
    });
  })(req, res, next);
});

router.post('/auth/logout', (req, res) => {
  req.logout((err: any) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ message: 'Logout successful' });
  });
});

router.get('/auth/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    // For demo purposes, just return success
    res.json({ message: 'OTP sent successfully', email });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

router.post('/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    // For demo purposes, accept any OTP
    if (email && otp) {
      const user = { id: '1', email, name: 'Demo User' };
      req.logIn(user, (err: any) => {
        if (err) return res.status(500).json({ error: 'Login failed' });
        res.json({ user, message: 'OTP verified successfully' });
      });
    } else {
      res.status(400).json({ error: 'Invalid OTP' });
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Protected routes
router.use(requireAuth);

// Dashboard routes
router.get('/dashboard/metrics', async (req, res) => {
  try {
    const metrics = await storage.getDashboardMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

// Customer routes
router.get('/customers', async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const consolidated = req.query.consolidated === 'true';
    
    const result = await storage.getCustomers(page, limit, consolidated);
    res.json(result);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.get('/customers/:id', async (req, res) => {
  try {
    const customer = await storage.getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

router.post('/customers', async (req, res) => {
  try {
    const validatedData = insertCustomerSchema.parse(req.body);
    const customer = await storage.createCustomer(validatedData);
    res.status(201).json(customer);
  } catch (error: any) {
    console.error('Create customer error:', error);
    if (error.name === 'ZodError') {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

router.patch('/customers/:id', async (req, res) => {
  try {
    const validatedData = insertCustomerSchema.partial().parse(req.body);
    const customer = await storage.updateCustomer(req.params.id, validatedData);
    res.json(customer);
  } catch (error: any) {
    console.error('Update customer error:', error);
    if (error.name === 'ZodError') {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

router.delete('/customers/:id', async (req, res) => {
  try {
    await storage.deleteCustomer(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// Transaction routes
router.get('/transactions', async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    
    const result = await storage.getTransactions(page, limit);
    res.json(result);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

router.get('/transactions/:id', async (req, res) => {
  try {
    const transaction = await storage.getTransactionById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

router.post('/transactions', async (req, res) => {
  try {
    const validatedData = insertTransactionSchema.parse(req.body);
    const transaction = await storage.createTransaction(validatedData);
    res.status(201).json(transaction);
  } catch (error: any) {
    console.error('Create transaction error:', error);
    if (error.name === 'ZodError') {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Staff routes
router.get('/staff', async (req, res) => {
  try {
    const staff = await storage.getStaff();
    res.json(staff);
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

router.post('/staff', async (req, res) => {
  try {
    const validatedData = insertStaffSchema.parse(req.body);
    const staff = await storage.createStaff(validatedData);
    res.status(201).json(staff);
  } catch (error: any) {
    console.error('Create staff error:', error);
    if (error.name === 'ZodError') {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    res.status(500).json({ error: 'Failed to create staff' });
  }
});

router.patch('/staff/:id', async (req, res) => {
  try {
    const validatedData = insertStaffSchema.partial().parse(req.body);
    const staff = await storage.updateStaff(req.params.id, validatedData);
    res.json(staff);
  } catch (error: any) {
    console.error('Update staff error:', error);
    if (error.name === 'ZodError') {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    res.status(500).json({ error: 'Failed to update staff' });
  }
});

router.delete('/staff/:id', async (req, res) => {
  try {
    await storage.deleteStaff(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ error: 'Failed to delete staff' });
  }
});

// Sync routes
router.get('/sync/config', async (req, res) => {
  try {
    const configs = await storage.getSyncConfigs();
    res.json(configs);
  } catch (error) {
    console.error('Get sync configs error:', error);
    res.status(500).json({ error: 'Failed to fetch sync configurations' });
  }
});

router.post('/sync/config', async (req, res) => {
  try {
    const validatedData = insertSyncConfigSchema.parse(req.body);
    const config = await storage.createSyncConfig(validatedData);
    res.status(201).json(config);
  } catch (error: any) {
    console.error('Create sync config error:', error);
    if (error.name === 'ZodError') {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    res.status(500).json({ error: 'Failed to create sync configuration' });
  }
});

router.get('/sync/status', async (req, res) => {
  try {
    const configs = await storage.getSyncConfigs();
    const status = {
      configs: configs.length,
      lastSync: configs.find(c => c.lastSyncAt)?.lastSyncAt || null,
      status: 'ready'
    };
    res.json(status);
  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json({ error: 'Failed to fetch sync status' });
  }
});

export default router;