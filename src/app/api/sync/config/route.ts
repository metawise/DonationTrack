import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Return sync configuration
    return NextResponse.json({
      syncEnabled: true,
      syncInterval: 3600000, // 1 hour in milliseconds
      lastSyncAt: null,
      lastSyncStatus: 'ready',
      apiEndpoint: 'https://dev-api.mywell.io/api/transaction/gift/search',
      maxPagesPerSync: 10,
      syncMode: 'manual', // 'manual' or 'auto'
      features: {
        autoSync: false,
        realTimeNotifications: false,
        incrementalSync: false
      }
    });
  } catch (error: any) {
    console.error('Error fetching sync config:', error);
    return NextResponse.json({ error: 'Failed to fetch sync configuration' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}