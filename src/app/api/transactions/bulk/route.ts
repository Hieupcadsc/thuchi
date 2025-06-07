
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/sqlite';

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

    const deleteStmt = db.prepare("DELETE FROM transactions WHERE id = ?");
    
    let successfullyDeletedCount = 0;
    const errors: string[] = [];

    const runManyDeletes = db.transaction((items: TransactionToDelete[]) => {
      for (const item of items) {
        try {
          const info = deleteStmt.run(item.id);
          if (info.changes > 0) {
            successfullyDeletedCount++;
          } else {
            errors.push(`Transaction with ID ${item.id} not found or not deleted.`);
          }
        } catch (dbError: any) {
           console.error(`[API_SQLite /transactions/bulk] Error deleting transaction ID ${item.id}:`, dbError.message);
           errors.push(`Error deleting transaction ID ${item.id}: ${dbError.message}`);
        }
      }
    });

    runManyDeletes(transactionsToDelete);

    if (errors.length > 0) {
      return NextResponse.json({ 
        message: `Processed bulk delete. Successfully deleted: ${successfullyDeletedCount}. Some errors occurred.`, 
        deletedCount: successfullyDeletedCount,
        errors 
      }, { status: successfullyDeletedCount > 0 && errors.length > 0 ? 207 : 500 }); // 207 Multi-Status if partial success
    }

    return NextResponse.json({ message: `Successfully deleted ${successfullyDeletedCount} transactions.`, deletedCount: successfullyDeletedCount });

  } catch (error: any) {
    console.error('[API_SQLite POST /transactions/bulk] Error:', error.message, error.stack);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'Invalid JSON in request body' }, { status: 400 });
    }
    let statusCode = typeof error.code === 'number' && error.code >= 200 && error.code <= 599 ? error.code : 500;
    return NextResponse.json({ message: error.message || 'Failed to bulk delete transactions.', details: error.stack }, { status: statusCode });
  }
}
