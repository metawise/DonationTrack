import { NextRequest, NextResponse } from 'next/server';
import { dbHelpers } from '@shared/database-helpers';
import * as crypto from 'crypto';
import aws4 from 'aws4';

// Helper to create unique customer ID
function createExternalCustomerId(firstName: string, lastName: string, email: string | null) {
  const baseId = `${firstName}_${lastName}_${email || 'no-email'}`.toLowerCase().replace(/\s+/g, '-');
  return baseId;
}

// AWS4 sign request if credentials are available
function signRequest(url: string, method: string, headers: any, body: string) {
  const ACCESS_KEY = process.env.MYWELL_ACCESS_KEY_ID;
  const SECRET_KEY = process.env.MYWELL_SECRET_ACCESS_KEY;
  
  if (!ACCESS_KEY || !SECRET_KEY) {
    console.log('⚠️ AWS credentials not found, using unsigned request');
    return headers;
  }

  const urlParts = new URL(url);
  
  const opts = {
    host: urlParts.hostname,
    path: urlParts.pathname + urlParts.search,
    method,
    headers: {
      ...headers,
      'Host': urlParts.hostname
    },
    body,
    service: 'execute-api',
    region: 'us-east-1'
  };

  const signed = aws4.sign(opts, {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY
  });

  return signed.headers;
}

export async function POST(request: NextRequest) {
  try {
    const API_BASE_URL = 'https://dev-api.mywell.io/api/transaction/gift/search';
    const API_TOKEN_PUBLIC = process.env.MYWELL_API_TOKEN_PUBLIC || '84c7f095-8f50-4645-bc65-b0163c104839';
    const API_TOKEN_PRIVATE = process.env.MYWELL_API_TOKEN_PRIVATE || API_TOKEN_PUBLIC;
    
    let totalSynced = 0;
    let totalProcessed = 0;
    let page = 1;
    let hasMore = true;
    const errors: string[] = [];

    console.log('🚀 Starting MyWell sync...');

    while (hasMore && page <= 10) { // Limit to 10 pages for safety
      try {
        const requestBody = JSON.stringify({});
        const url = `${API_BASE_URL}?page=${page}`;
        console.log(`📄 Fetching page ${page}...`);

        // Get headers with AWS signature if available
        const headers = signRequest(url, 'POST', {
          'Content-Type': 'application/json',
          'apiToken': API_TOKEN_PRIVATE
        }, requestBody);

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: requestBody
        });

        if (!response.ok) {
          console.error(`Page ${page} failed:`, response.status);
          hasMore = false;
          break;
        }

        const data = await response.json();
        const transactions = data.data || [];
        
        if (transactions.length === 0) {
          console.log(`No transactions on page ${page}, stopping.`);
          hasMore = false;
          break;
        }

        console.log(`Found ${transactions.length} transactions on page ${page}`);

        // Process each transaction
        for (const tx of transactions) {
          try {
            // Skip if no customer info
            if (!tx.customerFirstName && !tx.customerLastName) {
              continue;
            }

            // Create/find customer
            const externalCustomerId = createExternalCustomerId(
              tx.customerFirstName || '',
              tx.customerLastName || '',
              tx.customerEmail || null
            );

            let customer = await dbHelpers.findCustomerByExternalId(externalCustomerId);
            
            if (!customer) {
              // Create new customer
              customer = await dbHelpers.createCustomer({
                id: crypto.randomUUID(),
                externalCustomerId,
                firstName: tx.customerFirstName || '',
                lastName: tx.customerLastName || '',
                email: tx.customerEmail || null,
                phone: tx.customerPhone || null,
                address: `${tx.billingStreet1 || ''} ${tx.billingStreet2 || ''}`.trim() || null,
                city: tx.billingCity || null,
                state: tx.billingState || null,
                zipCode: tx.billingPostalCode || null,
                country: tx.billingCountry || 'USA',
                source: 'mywell_sync',
                totalDonations: 0,
                lastDonationDate: tx.createdAt ? new Date(tx.createdAt) : new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
              });
              console.log(`✅ Created customer: ${customer.firstName} ${customer.lastName}`);
            }

            // Check if transaction exists
            const transactionId = tx.transactionId || tx.id || crypto.randomUUID();
            const existing = await dbHelpers.getTransactionById(transactionId);
            
            if (!existing) {
              // Create transaction
              await dbHelpers.createTransaction({
                id: transactionId,
                externalCustomerId,
                customerId: customer.id,
                type: tx.transactionType || 'SALE',
                kind: tx.transactionKind || 'DONATION',
                amount: Math.round((tx.totalAmount || tx.amount || 0) * 100), // Convert to cents
                currency: tx.currency || 'USD',
                status: tx.status || 'PENDING',
                paymentMethod: tx.paymentMethod || tx.methodType || 'UNKNOWN',
                responseCode: tx.responseCode || null,
                responseMessage: tx.responseMessage || null,
                emailAddress: tx.customerEmail || null,
                description: tx.designation || tx.description || null,
                createdAt: tx.createdAt ? new Date(tx.createdAt) : new Date(),
                updatedAt: new Date(),
                settledAt: tx.settledAt ? new Date(tx.settledAt) : null,
                syncedAt: new Date()
              });
              totalSynced++;
            }
            totalProcessed++;
          } catch (err: any) {
            console.error(`Error processing transaction:`, err.message);
            errors.push(`TX Error: ${err.message}`);
          }
        }

        page++;
        
        // Check if there are more pages
        if (transactions.length < 10) {
          hasMore = false;
        }
      } catch (pageError: any) {
        console.error(`Error on page ${page}:`, pageError);
        errors.push(`Page ${page}: ${pageError.message}`);
        hasMore = false;
      }
    }

    console.log(`✅ Sync complete: ${totalSynced} new, ${totalProcessed} processed`);
    
    return NextResponse.json({
      success: true,
      message: 'Sync completed',
      totalProcessed,
      newTransactions: totalSynced,
      pagesChecked: page - 1,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error: any) {
    console.error('Sync failed:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}