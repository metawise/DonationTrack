import { NextRequest, NextResponse } from 'next/server';
import { dbHelpers } from '@shared/database-helpers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const result = await dbHelpers.getTransactions({
      search,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      limit
    });
    
    // Handle both possible response formats from dbHelpers
    const transactions = result?.transactions || result || [];
    const total = result?.total || transactions.length || 0;
    
    return NextResponse.json({
      transactions: Array.isArray(transactions) ? transactions : [],
      pagination: {
        page,
        limit,
        total: total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const newTransaction = await dbHelpers.createTransaction(body);
    
    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    console.error('Create transaction error:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}