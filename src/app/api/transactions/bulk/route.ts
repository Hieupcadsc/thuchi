
import { NextRequest, NextResponse } from 'next/server';
import { firestoreService } from '@/lib/firestore-service';

interface TransactionToDelete {
  id: string;
  // monthYear is no longer strictly needed for deletion by ID with SQLite,
  // but it's kept if the client sends it to maintain structure.
  monthYear?: string;
}

// initDb(); // initDb is now called when sqlite.ts is imported

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const transactionsToDelete: TransactionToDelete[] = body.transactions;

    if (!Array.isArray(transactionsToDelete) || transactionsToDelete.length === 0) {
      return NextResponse.json({ message: 'No transactions provided for deletion or invalid format.' }, { status: 400 });
    }

    // Extract transaction IDs
    const transactionIds = transactionsToDelete.map(item => item.id);
    
    try {
      await firestoreService.bulkDeleteTransactions(transactionIds);
      
      console.log(`[Firestore BULK DELETE] Successfully deleted ${transactionIds.length} transactions.`);
      return NextResponse.json({ 
        message: `Successfully deleted ${transactionIds.length} transactions.`,
        deletedCount: transactionIds.length 
      });
    } catch (deleteError: any) {
      console.error('[Firestore BULK DELETE] Error:', deleteError.message);
      return NextResponse.json({ 
        message: 'Failed to bulk delete transactions.',
        error: deleteError.message 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[API_SQLite POST /transactions/bulk] Error:', error.message, error.stack);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'Invalid JSON in request body' }, { status: 400 });
    }
    let statusCode = typeof error.code === 'number' && error.code >= 200 && error.code <= 599 ? error.code : 500;
    return NextResponse.json({ message: error.message || 'Failed to bulk delete transactions.', details: error.stack }, { status: statusCode });
  }
}
