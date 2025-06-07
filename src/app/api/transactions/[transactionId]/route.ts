
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/sqlite';
import type { Transaction } from '@/types';

// initDb(); // initDb is now called when sqlite.ts is imported

export async function PUT(request: NextRequest, { params }: { params: { transactionId: string } }) {
  const { transactionId } = params;
  try {
    const updatedTransactionData = await request.json() as Omit<Transaction, 'amount'> & { amount: string | number };

    // Ensure amount is a number
    const amountAsNumber = Number(updatedTransactionData.amount);
    if (isNaN(amountAsNumber)) {
      return NextResponse.json({ message: 'Invalid amount format. Amount must be a number.' }, { status: 400 });
    }
    const finalTransactionData: Transaction = {
        ...updatedTransactionData,
        amount: amountAsNumber,
    };


    if (finalTransactionData.id !== transactionId) {
        return NextResponse.json({ message: 'Transaction ID in path does not match ID in body.' }, { status: 400 });
    }
    // monthYear is derived from date, so validation on date implies monthYear validation.
    // Re-derive monthYear to ensure consistency if date changed
    finalTransactionData.monthYear = finalTransactionData.date.substring(0,7);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(finalTransactionData.date)) {
        return NextResponse.json({ message: 'Invalid date format. Expected YYYY-MM-DD.' }, { status: 400 });
    }
     if (!finalTransactionData.paymentSource) {
        return NextResponse.json({ message: 'paymentSource is required in transaction data for update.' }, { status: 400 });
    }


    const stmt = db.prepare(`
      UPDATE transactions 
      SET userId = ?, description = ?, amount = ?, date = ?, type = ?, categoryId = ?, 
          monthYear = ?, note = ?, performedBy = ?, paymentSource = ?
      WHERE id = ?
    `);
    const info = stmt.run(
      finalTransactionData.userId,
      finalTransactionData.description,
      finalTransactionData.amount,
      finalTransactionData.date,
      finalTransactionData.type,
      finalTransactionData.categoryId,
      finalTransactionData.monthYear, // Use re-derived monthYear
      finalTransactionData.note || null,
      finalTransactionData.performedBy,
      finalTransactionData.paymentSource,
      transactionId
    );

    if (info.changes === 0) {
      return NextResponse.json({ message: `Transaction with ID ${transactionId} not found.` }, { status: 404 });
    }

    // Fetch the updated transaction to return it
    const updatedStmt = db.prepare("SELECT * FROM transactions WHERE id = ?");
    const result = updatedStmt.get(transactionId) as Transaction | undefined;


    console.log(`[API_SQLite /transactions/${transactionId}] Transaction updated successfully.`);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`[API_SQLite PUT /transactions/${transactionId}] Error:`, error.message, error.stack);
    const message = error.message || 'Failed to update transaction.';
    let statusCode = typeof error.code === 'number' && error.code >= 200 && error.code <= 599 ? error.code : 500;
    return NextResponse.json({ message, details: error.stack }, { status: statusCode });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { transactionId: string } }) {
  const { transactionId } = params;
  // const { searchParams } = new URL(request.url);
  // const monthYear = searchParams.get('monthYear'); // monthYear is no longer strictly needed for deletion by ID with SQLite

  // if (!monthYear) { // Kept for API contract consistency but not used in query
  //   return NextResponse.json({ message: 'monthYear query parameter is required for deletion (though not used in SQLite context).' }, { status: 400 });
  // }

  try {
    const stmt = db.prepare("DELETE FROM transactions WHERE id = ?");
    const info = stmt.run(transactionId);

    if (info.changes === 0) {
      return NextResponse.json({ message: `Transaction with ID ${transactionId} not found.` }, { status: 404 });
    }

    console.log(`[API_SQLite /transactions/${transactionId}] Transaction deleted successfully.`);
    return NextResponse.json({ message: `Transaction ${transactionId} deleted successfully.` });
  } catch (error: any) {
    console.error(`[API_SQLite DELETE /transactions/${transactionId}] Error:`, error.message, error.stack);
    const message = error.message || 'Failed to delete transaction.';
    let statusCode = typeof error.code === 'number' && error.code >= 200 && error.code <= 599 ? error.code : 500;
    return NextResponse.json({ message, details: error.stack }, { status: statusCode });
  }
}
