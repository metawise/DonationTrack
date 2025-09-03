import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dbHelpers } from '../../lib/database';
// AWS signing library for MyWell API authentication
let aws4: any;
try {
  aws4 = require('aws4');
} catch (error) {
  console.log('AWS4 library not available, using fallback authentication');
}

const MYWELL_API_BASE = 'https://dev-api.mywell.io/api';
const MYWELL_API_TOKEN_PRIVATE = process.env.MYWELL_API_TOKEN_PRIVATE || '6db9e203-041c-4c5f-80ae-02382a94d609';
const MYWELL_API_TOKEN_PUBLIC = process.env.MYWELL_API_TOKEN_PUBLIC || 'pub_32CUcl4N2z6YIMqZCc3uH52FomP';

interface MyWellTransaction {
  id: string;
  externalCustomerId: string;
  type: string;
  kind: string;
  amount: number;
  status: string;
  emailAddress?: string;
  paymentMethod?: string;
  responseBody?: any;
  responseCode?: number;
  responseMessage?: string;
  subscriptionId?: string;
  settlementBatchId?: string;
  billingAddress?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  shippingAddress?: any;
  ipAddress?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  settledAt?: string;
  piUpdatedAt?: string;
}

interface MyWellResponse {
  data: MyWellTransaction[];
  count: number;
  totalCount: number;
  page: number;
  totalPages: number;
}

async function fetchMyWellTransactions(startDate: string, endDate: string, page = 1, limit = 100): Promise<MyWellResponse> {
  const url = `${MYWELL_API_BASE}/transaction/gift/search`;
  const params = new URLSearchParams({
    startDate,
    endDate,
    page: page.toString(),
    limit: limit.toString()
  });

  console.log(`🔗 Fetching MyWell transactions: ${url}?${params}`);

  // Use MyWell API credentials for authentication
  const accessKeyId = MYWELL_API_TOKEN_PUBLIC;
  const secretAccessKey = MYWELL_API_TOKEN_PRIVATE;

  // MyWell API authentication methods with proper credentials
  const authMethods = [
    { name: 'Bearer Private Token', headers: { 'Authorization': `Bearer ${MYWELL_API_TOKEN_PRIVATE}` } },
    { name: 'X-API-Key Private', headers: { 'X-API-Key': MYWELL_API_TOKEN_PRIVATE } },
    { name: 'Api-Key Private', headers: { 'Api-Key': MYWELL_API_TOKEN_PRIVATE } },
    { name: 'Bearer Public Token', headers: { 'Authorization': `Bearer ${MYWELL_API_TOKEN_PUBLIC}` } },
    { name: 'X-API-Key Public', headers: { 'X-API-Key': MYWELL_API_TOKEN_PUBLIC } },
    { name: 'MyWell Auth Headers', headers: { 'X-MyWell-Public': MYWELL_API_TOKEN_PUBLIC, 'X-MyWell-Private': MYWELL_API_TOKEN_PRIVATE } },
    { name: 'Combined Auth', headers: { 'Authorization': `${MYWELL_API_TOKEN_PUBLIC}:${MYWELL_API_TOKEN_PRIVATE}` } },
  ];

  // If AWS4 is available and we have proper credentials, try AWS authentication first
  if (aws4 && secretAccessKey && accessKeyId) {
    try {
      const requestOptions = {
        host: 'dev-api.mywell.io',
        path: `/api/transaction/gift/search?${params}`,
        method: 'GET',
        service: 'execute-api',
        region: 'us-east-1',
        headers: {
          'Content-Type': 'application/json',
          'Host': 'dev-api.mywell.io'
        }
      };

      const signedRequest = aws4.sign(requestOptions, {
        accessKeyId,
        secretAccessKey
      });

      console.log(`🔐 Trying AWS Signature V4 with access key: ${accessKeyId.substring(0, 8)}...`);

      const awsResponse = await fetch(`https://${signedRequest.host}${signedRequest.path}`, {
        method: signedRequest.method,
        headers: signedRequest.headers,
      });

      if (awsResponse.ok) {
        console.log(`✅ AWS authentication successful!`);
        return awsResponse.json();
      } else {
        const errorText = await awsResponse.text();
        console.log(`❌ AWS auth failed: ${awsResponse.status} - ${errorText}`);
      }
    } catch (awsError: any) {
      console.log(`❌ AWS signing error: ${awsError?.message || awsError}`);
    }
  }

  // Try each authentication method
  console.log(`🔄 Trying ${authMethods.length} authentication methods...`);
  let lastError = '';
  
  for (const method of authMethods) {
    try {
      console.log(`🔑 Testing ${method.name}...`);
      
      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          ...method.headers,
          'Content-Type': 'application/json',
        } as any,
      });

      const responseText = await response.text();
      
      if (response.ok) {
        console.log(`✅ ${method.name} authentication successful!`);
        return JSON.parse(responseText);
      } else {
        lastError = `${method.name}: ${response.status} - ${responseText}`;
        console.log(`❌ ${lastError}`);
      }
    } catch (error: any) {
      lastError = `${method.name}: ${error?.message || error}`;
      console.log(`❌ ${lastError}`);
    }
  }

  // If all authentication methods fail, throw an error instead of creating mock data
  console.log(`❌ All authentication methods failed. MyWell API authentication required.`);
  throw new Error(`MyWell API authentication failed. Last error: ${lastError}. Please verify your API token is correct.`);
}

async function processTransaction(transaction: MyWellTransaction) {
  try {
    // Create or update customer if billing address exists
    let customerId: string | null = null;
    if (transaction.billingAddress?.firstName && transaction.billingAddress?.lastName) {
      const customerData = {
        externalCustomerId: transaction.externalCustomerId,
        firstName: transaction.billingAddress.firstName,
        lastName: transaction.billingAddress.lastName,
        email: transaction.billingAddress.email || null,
        phone: transaction.billingAddress.phone || null,
        address: transaction.billingAddress.street1 || null,
        city: transaction.billingAddress.city || null,
        state: transaction.billingAddress.state || null,
        postalCode: transaction.billingAddress.postalCode || null,
        country: transaction.billingAddress.country || null,
      };

      // Check if customer already exists
      const existingCustomer = await dbHelpers.findCustomerByName(
        customerData.firstName, 
        customerData.lastName
      );

      if (existingCustomer) {
        customerId = existingCustomer.id;
        // Update customer info if needed
        await dbHelpers.updateCustomer(customerId, customerData);
      } else {
        // Create new customer
        const newCustomer = await dbHelpers.createCustomer(customerData);
        customerId = newCustomer.id;
      }
    }

    // Create or update transaction
    const transactionData = {
      id: transaction.id,
      externalCustomerId: transaction.externalCustomerId,
      customerId,
      type: transaction.type,
      kind: transaction.kind,
      amount: transaction.amount,
      status: transaction.status,
      emailAddress: transaction.emailAddress || null,
      paymentMethod: transaction.paymentMethod || null,
      responseBody: transaction.responseBody || null,
      responseCode: transaction.responseCode || null,
      responseMessage: transaction.responseMessage || null,
      subscriptionId: transaction.subscriptionId || null,
      settlementBatchId: transaction.settlementBatchId || null,
      billingAddress: transaction.billingAddress || null,
      shippingAddress: transaction.shippingAddress || null,
      ipAddress: transaction.ipAddress || null,
      description: transaction.description || null,
      createdAt: new Date(transaction.createdAt),
      updatedAt: new Date(transaction.updatedAt),
      settledAt: transaction.settledAt ? new Date(transaction.settledAt) : null,
      piUpdatedAt: transaction.piUpdatedAt ? new Date(transaction.piUpdatedAt) : null,
      syncedAt: new Date(),
    };

    await dbHelpers.upsertTransaction(transactionData);
    return { success: true };
  } catch (error: any) {
    console.error(`Failed to process transaction ${transaction.id}:`, error);
    return { success: false, error: error?.message || error };
  }
}

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
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'startDate and endDate are required',
        example: { startDate: '2025-08-26', endDate: '2025-08-31' }
      });
    }

    console.log('🔄 Starting MyWell sync:', { startDate, endDate });
    
    let totalTransactions = 0;
    let customersCreated = 0;
    let customersUpdated = 0;
    let transactionsProcessed = 0;
    let errors: any[] = [];
    
    let currentPage = 1;
    let hasMorePages = true;

    // Fetch all pages of transactions
    while (hasMorePages) {
      try {
        console.log(`📄 Fetching page ${currentPage}...`);
        const response = await fetchMyWellTransactions(startDate, endDate, currentPage);
        
        console.log(`✅ Retrieved ${response.data.length} transactions from page ${currentPage}`);
        
        // Process each transaction
        for (const transaction of response.data) {
          const result = await processTransaction(transaction);
          if (result.success) {
            transactionsProcessed++;
          } else {
            errors.push({ transactionId: transaction.id, error: result.error });
          }
        }
        
        totalTransactions += response.data.length;
        hasMorePages = currentPage < response.totalPages;
        currentPage++;
        
        // Safety break to prevent infinite loops
        if (currentPage > 100) {
          console.warn('⚠️ Safety break: More than 100 pages detected');
          break;
        }
      } catch (error: any) {
        console.error(`❌ Error fetching page ${currentPage}:`, error);
        errors.push({ page: currentPage, error: error?.message || error });
        break;
      }
    }

    // Update sync config
    try {
      await dbHelpers.updateSyncConfig('mywell_transactions', {
        lastSyncAt: new Date(),
        lastSyncStatus: errors.length > 0 ? 'partial_success' : 'success',
        lastSyncError: errors.length > 0 ? `${errors.length} errors occurred` : null,
        totalRecordsSynced: transactionsProcessed,
      });
    } catch (error) {
      console.error('Failed to update sync config:', error);
    }
    
    const syncResult = {
      status: errors.length > 0 ? 'partial_success' : 'success',
      transactionsProcessed,
      totalTransactionsRetrieved: totalTransactions,
      customersCreated,
      customersUpdated,
      errors: errors.slice(0, 10), // Only return first 10 errors
      errorCount: errors.length,
      dateRange: { startDate, endDate },
      pagesProcessed: currentPage - 1,
      syncTime: new Date()
    };
    
    console.log('🎉 MyWell sync completed:', syncResult);
    
    return res.status(200).json({
      message: 'MyWell sync completed successfully',
      result: syncResult
    });
  } catch (error) {
    console.error('❌ MyWell sync failed:', error);
    
    // Update sync config with error
    try {
      await dbHelpers.updateSyncConfig('mywell_transactions', {
        lastSyncAt: new Date(),
        lastSyncStatus: 'error',
        lastSyncError: (error as any)?.message || String(error),
      });
    } catch (updateError) {
      console.error('Failed to update sync config with error:', updateError);
    }
    
    return res.status(500).json({ 
      error: 'MyWell sync failed',
      details: (error as any)?.message || String(error) 
    });
  }
}