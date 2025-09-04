import { NextRequest, NextResponse } from 'next/server';
import { dbHelpers } from '@shared/database-helpers';
import * as crypto from 'crypto';

// Helper to create unique customer ID
function createExternalCustomerId(firstName: string, lastName: string, email: string | null) {
  const baseId = `${firstName}_${lastName}_${email || 'no-email'}`.toLowerCase().replace(/\s+/g, '-');
  return baseId;
}

// Simple auth headers - no AWS needed
function getAuthHeaders() {
  const API_TOKEN_PRIVATE = process.env.MYWELL_API_TOKEN_PRIVATE;
  const API_TOKEN_PUBLIC = process.env.MYWELL_API_TOKEN_PUBLIC || '84c7f095-8f50-4645-bc65-b0163c104839';
  
  // Use private token if available, otherwise public
  const apiToken = API_TOKEN_PRIVATE || API_TOKEN_PUBLIC;
  
  return {
    'Content-Type': 'application/json',
    'apiToken': apiToken,
    'Accept': 'application/json'
  };
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
        // MyWell API request format based on actual working call
        const requestBody = JSON.stringify({
          "createdAt": {
            "startDate": "2025-08-01",  // Get transactions from last month
            "endDate": "2025-09-04"
          },
          "limit": 500
        });
        
        console.log(`📄 Fetching transactions from MyWell API...`);

        const response = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: requestBody
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API failed:`, response.status, errorText);
          hasMore = false;
          break;
        }

        const data = await response.json();
        // The API returns an array directly or wrapped in data
        const transactions = Array.isArray(data) ? data : (data.data || []);
        
        if (transactions.length === 0) {
          console.log(`No transactions found`);
          hasMore = false;
          break;
        }

        console.log(`Found ${transactions.length} transactions`);

        // Process each transaction
        for (const tx of transactions) {
          try {
            // For transactions without customer info, create anonymous customer
            // Real customer data would come from a separate customer API endpoint
            const customerId = tx.customerId || `anonymous_${tx.id}`;
            const firstName = 'Anonymous';
            const lastName = `Donor_${tx.id.substring(0, 8)}`;
            const email = tx.emailAddress || null;
            
            console.log(`Processing transaction ${tx.id} - amount: $${(tx.amount/100).toFixed(2)}`);

            // Create/find customer
            const externalCustomerId = tx.customerId || createExternalCustomerId(
              firstName,
              lastName,
              email
            );

            let customer = await dbHelpers.findCustomerByExternalId(externalCustomerId);
            
            if (!customer) {
              // Create new customer based on MyWell data structure
              customer = await dbHelpers.createCustomer({
                id: crypto.randomUUID(),
                externalCustomerId,
                firstName,
                lastName,
                email,
                phone: tx.phone || null,
                address: tx.billingAddress?.street1 || tx.street1 || null,
                city: tx.billingAddress?.city || tx.city || null,
                state: tx.billingAddress?.state || tx.state || null,
                zipCode: tx.billingAddress?.postalCode || tx.postalCode || null,
                country: tx.billingAddress?.country || tx.country || 'USA',
                source: 'mywell_sync',
                totalDonations: 0,
                lastDonationDate: tx.createdAt ? new Date(tx.createdAt) : new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
              });
              console.log(`✅ Created customer: ${customer.firstName} ${customer.lastName}`);
            }

            // Check if transaction exists using MyWell ID
            const transactionId = tx.id;
            const existing = await dbHelpers.getTransactionById(transactionId);
            
            if (!existing) {
              // Create transaction based on actual MyWell response structure
              await dbHelpers.createTransaction({
                id: transactionId,
                externalCustomerId,
                customerId: customer.id,
                type: tx.type || 'SALE',
                kind: tx.kind || 'DONATION', 
                amount: tx.amount || 0, // MyWell sends amount in cents already
                currency: tx.currencyType || 'USD',
                status: tx.status || 'SETTLED',
                paymentMethod: tx.paymentMethod || 'CARD',
                responseCode: tx.responseCode || null,
                responseMessage: tx.responseMessage || null,
                emailAddress: email,
                description: null,
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

        // Only fetch one page for now - MyWell API doesn't paginate this way
        hasMore = false;
        console.log(`Processing ${transactions.length} transactions...`);
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