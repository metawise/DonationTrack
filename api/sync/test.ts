import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dbHelpers } from '../../lib/database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Starting sync mechanism test...');
    
    // Count transactions before
    const countBefore = await dbHelpers.getTransactions(1, 1);
    console.log(`📊 Current transactions: ${countBefore.total}`);
    
    // Create a test customer with required external_customer_id
    const testCustomer = await dbHelpers.createCustomer({
      externalCustomerId: `test-external-${Date.now()}`,
      firstName: 'Test',
      lastName: 'Customer',
      email: 'test@example.com',
      phone: '555-0123',
      address: '123 Test St',
      city: 'Test City',
      state: 'TS',
      postalCode: '12345',
      country: 'US',
    });
    
    console.log(`👤 Created test customer: ${testCustomer.id}`);
    
    // Create a test transaction
    const testTransaction = {
      id: `test-transaction-${Date.now()}`,
      externalCustomerId: `test-external-${Date.now()}`,
      customerId: testCustomer.id,
      type: 'SALE',
      kind: 'DONATION',
      amount: 2500, // $25.00
      status: 'SETTLED',
      emailAddress: null,
      paymentMethod: 'test-payment-method',
      responseBody: { test: true },
      responseCode: 200,
      responseMessage: 'Test transaction',
      subscriptionId: null,
      settlementBatchId: null,
      billingAddress: {
        firstName: 'Test',
        lastName: 'Customer',
        email: 'test@example.com',
        city: 'Test City',
        state: 'TS',
        country: 'US',
        street1: '123 Test St',
        postalCode: '12345'
      },
      shippingAddress: null,
      ipAddress: '127.0.0.1',
      description: 'Test transaction for sync verification',
      createdAt: new Date(),
      updatedAt: new Date(),
      settledAt: new Date(),
      piUpdatedAt: new Date(),
      syncedAt: new Date(),
    };
    
    // Use upsertTransaction to test the sync mechanism
    const createdTransaction = await dbHelpers.upsertTransaction(testTransaction);
    console.log(`💳 Created test transaction: ${createdTransaction.id}`);
    
    // Count transactions after
    const countAfter = await dbHelpers.getTransactions(1, 1);
    console.log(`📊 Transactions after test: ${countAfter.total}`);
    
    const result = {
      status: 'success',
      message: 'Sync mechanism test completed',
      transactionsBefore: countBefore.total,
      transactionsAfter: countAfter.total,
      transactionsAdded: countAfter.total - countBefore.total,
      testCustomerId: testCustomer.id,
      testTransactionId: createdTransaction.id
    };
    
    console.log('✅ Sync mechanism test successful:', result);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ Sync mechanism test failed:', error);
    return res.status(500).json({ 
      error: 'Sync mechanism test failed',
      details: error.message 
    });
  }
}