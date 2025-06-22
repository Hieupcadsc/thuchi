import { NextRequest, NextResponse } from 'next/server';
import type { Transaction } from '@/types';
import { firestoreService } from '@/lib/firestore-service';

// GET /api/transactions - get transactions by month/family
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId');
    const monthYear = searchParams.get('monthYear');

    console.log('API GET transactions called with:', { familyId, monthYear });

    if (!familyId || !monthYear) {
      return NextResponse.json(
        { error: 'familyId and monthYear are required' },
        { status: 400 }
      );
    }

    console.log('Calling firestoreService.getTransactionsByMonth...');
    const transactions = await firestoreService.getTransactionsByMonth(familyId, monthYear);
    console.log('Successfully fetched transactions:', transactions.length);
    
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { error: 'Failed to fetch transactions', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST /api/transactions - add new transaction
export async function POST(request: NextRequest) {
  try {
    const transaction: Omit<Transaction, 'id'> = await request.json();
    
    // Validate required fields
    if (!transaction.familyId || !transaction.description || !transaction.amount || 
        !transaction.date || !transaction.type || !transaction.categoryId || 
        !transaction.monthYear || !transaction.performedBy || !transaction.paymentSource) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const savedTransaction = await firestoreService.addTransaction(transaction);
    return NextResponse.json(savedTransaction, { status: 201 });
  } catch (error) {
    console.error('Error adding transaction:', error);
    return NextResponse.json(
      { error: 'Failed to add transaction' },
      { status: 500 }
    );
  }
}
