import { NextRequest, NextResponse } from 'next/server';
import { dbHelpers } from '@shared/database-helpers';

export async function GET(request: NextRequest) {
  try {
    const status = await dbHelpers.getSyncStatus();
    
    if (!status) {
      return NextResponse.json({
        lastSyncDate: null,
        lastSyncStatus: 'never_synced',
        lastSyncError: null,
        totalRecordsSynced: 0
      });
    }
    
    return NextResponse.json(status);
  } catch (error) {
    console.error('Get sync status error:', error);
    return NextResponse.json({ error: 'Failed to fetch sync status' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}