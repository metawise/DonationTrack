import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // For now, return a basic status since sync runs on-demand
    return NextResponse.json({
      lastSyncDate: null,
      lastSyncStatus: 'ready',
      lastSyncError: null,
      totalRecordsSynced: 0,
      message: 'Sync runs on-demand via trigger'
    });
  } catch (error) {
    console.error('Get sync status error:', error);
    return NextResponse.json({ error: 'Failed to fetch sync status' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}