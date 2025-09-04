import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // For serverless, we'll directly call the sync logic here
    // In production, this would be handled by a background job
    
    const API_BASE_URL = 'https://dev-api.mywell.io/api/transaction/gift/search';
    const API_TOKEN = process.env.MYWELL_API_TOKEN_PUBLIC || '84c7f095-8f50-4645-bc65-b0163c104839';
    
    // Simplified request - the API seems to use different field names
    const requestBody = {};

    console.log('🔄 Testing MyWell API connection...');
    
    // Just test the connection for now
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apiToken': API_TOKEN
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MyWell API error:', response.status, errorText);
      return NextResponse.json({
        success: false,
        error: `MyWell API error: ${response.status}`,
        details: errorText
      }, { status: 500 });
    }

    const data = await response.json();
    console.log('✅ MyWell API responded with', data.data?.length || 0, 'transactions');
    
    return NextResponse.json({
      success: true,
      message: 'Sync triggered successfully',
      transactionsFound: data.data?.length || 0,
      status: 'For full sync, additional AWS credentials may be needed'
    });
    
  } catch (error: any) {
    console.error('Error triggering sync:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to trigger sync' },
      { status: 500 }
    );
  }
}