import { NextRequest, NextResponse } from 'next/server';
import { dbHelpers } from '@shared/database-helpers';

// Helper function to create a unique external customer ID
function createExternalCustomerId(firstName: string, lastName: string, email: string | null) {
  const baseId = `${firstName}_${lastName}_${email || 'no-email'}`.toLowerCase().replace(/\s+/g, '-');
  return baseId;
}

async function fetchMyWellTransactions(page: number = 1) {
  const API_BASE_URL = 'https://dev-api.mywell.io/api/transaction/gift/search';
  const API_TOKEN = process.env.MYWELL_API_TOKEN_PUBLIC || '84c7f095-8f50-4645-bc65-b0163c104839';
  
  const requestBody = {
    requestNumber: page.toString(),
    searchValue: "",
    status: "SETTLED", 
    campaignId: "",
    fundIds: [],
    accountIds: [],
    customerIds: [],
    dateFrom: "",
    dateTo: ""
  };

  console.log('🔄 Fetching MyWell transactions - Page:', page);
  
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apiToken': API_TOKEN
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`MyWell API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('MyWell API fetch error:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting MyWell sync process...');
    
    let page = 1;
    let totalSynced = 0;
    let hasMore = true;
    const allTransactions = [];

    while (hasMore) {
      const response = await fetchMyWellTransactions(page);
      
      if (!response.data || response.data.length === 0) {
        hasMore = false;
        break;
      }

      // Process each transaction
      for (const transaction of response.data) {
        try {
          // Create or update customer
          const externalCustomerId = createExternalCustomerId(
            transaction.customerFirstName,
            transaction.customerLastName,
            transaction.customerEmail
          );

          let customer = await dbHelpers.findCustomerByExternalId(externalCustomerId);

          if (!customer) {
            customer = await dbHelpers.createCustomer({
              externalCustomerId,
              firstName: transaction.customerFirstName || '',
              lastName: transaction.customerLastName || '',
              email: transaction.customerEmail || '',
              phone: transaction.customerPhoneNumber || '',
              address: transaction.customerAddress || '',
              city: transaction.customerCity || '',
              state: transaction.customerState || '',
              zipCode: transaction.customerZipCode || '',
              country: transaction.customerCountry || 'USA',
              source: 'mywell_api',
              totalDonations: 0,
              lastDonationDate: new Date(transaction.createdAt)
            });
            console.log(`✅ Created new customer: ${customer.firstName} ${customer.lastName}`);
          }

          // Create transaction - use transactionId as the ID
          const existingTransaction = await dbHelpers.getTransactionById(transaction.transactionId);

          if (!existingTransaction) {
            await dbHelpers.createTransaction({
              id: transaction.transactionId,
              externalTransactionId: transaction.transactionId,
              externalCustomerId,
              customerId: customer.id,
              amount: Math.round(transaction.totalAmount * 100),
              currency: transaction.currency || 'USD',
              status: transaction.status,
              paymentMethod: transaction.methodType,
              cardLast4: transaction.cardLast4 || '',
              description: transaction.designation || '',
              metadata: {
                campaignId: transaction.campaignId,
                campaignName: transaction.campaignName,
                fundId: transaction.fundId,
                fundName: transaction.fundName,
                isRecurring: transaction.isRecurringTransaction
              },
              createdAt: new Date(transaction.createdAt)
            });
            totalSynced++;
          }
        } catch (error) {
          console.error(`Error processing transaction ${transaction.transactionId}:`, error);
          continue;
        }
      }

      allTransactions.push(...response.data);
      
      // Check if there are more pages
      if (response.data.length < 10) {
        hasMore = false;
      } else {
        page++;
      }
    }

    // Update sync status
    // Update sync status (placeholder - no sync status table yet)
    console.log('✅ Sync completed successfully', {
      lastSyncDate: new Date(),
      lastSyncStatus: 'success',
      totalRecordsSynced: totalSynced
    });

    return NextResponse.json({
      success: true,
      message: `Sync completed successfully`,
      totalTransactions: allTransactions.length,
      newTransactions: totalSynced,
      pagesProcessed: page
    });
    
  } catch (error) {
    console.error('MyWell sync error:', error);
    
    // Update sync status with error
    console.error('❌ Sync failed with error', {
      lastSyncDate: new Date(),
      lastSyncStatus: 'error',
      lastSyncError: String(error)
    });

    return NextResponse.json({ 
      error: 'Sync failed', 
      details: String(error) 
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}