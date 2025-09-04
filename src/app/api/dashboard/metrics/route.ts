import { NextRequest, NextResponse } from 'next/server';
import { dbHelpers } from '@shared/database-helpers';

export async function GET(request: NextRequest) {
  try {
    const metrics = await dbHelpers.getDashboardMetrics();
    
    // Return metrics in cents as integers for precision
    return NextResponse.json({
      totalDonations: metrics.totalDonations || 0,
      activeSubscribers: metrics.activeSubscribers || 0,
      thisMonth: metrics.thisMonth || 0,
      avgDonation: metrics.avgDonation || 0
    });
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}