import { NextRequest, NextResponse } from 'next/server';
import type { Transaction } from '@/types';
import { firestoreService } from '@/lib/firestore-service';

// PUT /api/transactions/[transactionId] - update transaction
export async function PUT(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  try {
    const { transactionId } = params;
    const updates: Partial<Transaction> = await request.json();

    // Validate required fields for update
    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    await firestoreService.updateTransaction(transactionId, updates);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Transaction updated successfully' 
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

// DELETE /api/transactions/[transactionId] - delete transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  try {
    const { transactionId } = params;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    await firestoreService.deleteTransaction(transactionId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Transaction deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
