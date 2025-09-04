import { NextRequest, NextResponse } from 'next/server';
import { dbHelpers } from '@shared/database-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { amount, reason } = body;
    
    const transaction = await dbHelpers.getTransactionById(params.id);
    
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    
    // Update transaction status to refunded
    await dbHelpers.updateTransaction(params.id, { status: 'REFUNDED' });
    
    return NextResponse.json({
      success: true,
      message: 'Refund processed successfully',
      refundedAmount: amount || transaction.amount,
      reason
    });
  } catch (error) {
    console.error('Refund error:', error);
    return NextResponse.json({ error: 'Failed to process refund' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}