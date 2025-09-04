import { NextRequest, NextResponse } from 'next/server';
import { dbHelpers } from '@shared/database-helpers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const customers = await dbHelpers.getCustomers({ search, page, limit });
    // For now, return the count from the query
    const totalCustomers = customers?.length || 0;
    
    return NextResponse.json({
      customers: customers || [],
      pagination: {
        page,
        limit,
        total: totalCustomers,
        totalPages: Math.ceil(totalCustomers / limit)
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}