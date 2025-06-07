
import { type NextRequest, NextResponse } from 'next/server';
import type { Transaction, UserType } from '@/types';
import { db } from '@/lib/sqlite';
import { FAMILY_ACCOUNT_ID } from '@/lib/constants';

// initDb(); // initDb is now called when sqlite.ts is imported

async function getTransactionsFromDb(userIdToFetch: UserType, monthYear: string): Promise<Transaction[]> {
  console.log(`[API_SQLite /transactions] getTransactionsFromDb called for userId: ${userIdToFetch}, monthYear: ${monthYear}`);
  try {
    const stmt = db.prepare(`
      SELECT * FROM transactions 
      WHERE userId = ? AND monthYear = ? 
      ORDER BY date DESC, id DESC
    `); // Added id DESC for consistent ordering on same date
    const results = stmt.all(userIdToFetch, monthYear) as Transaction[];
    console.log(`[API_SQLite /transactions] Fetched ${results.length} transactions from DB for ${monthYear}.`);
    return results.map(t => ({
        ...t,
        amount: Number(t.amount) // Ensure amount is number
    }));
  } catch (error: any) {
    console.error(`[API_SQLite /transactions] Error in getTransactionsFromDb for monthYear "${monthYear}":`, error.message, error.stack);
    // If the table doesn't exist, it might throw an error. initDb should prevent this.
    // But if it does, return empty array rather than crashing.
    if (error.message && error.message.toLowerCase().includes('no such table')) {
        console.warn(`[API_SQLite /transactions] Table "transactions" not found. Returning empty array. Ensure initDb has run.`);
        return [];
    }
    throw error; // Re-throw other errors
  }
}

async function addTransactionToDb(transaction: Transaction): Promise<Transaction> {
  console.log(`[API_SQLite /transactions] addTransactionToDb called for transaction ID: ${transaction.id}, monthYear: ${transaction.monthYear}`);
  try {
    const stmt = db.prepare(`
      INSERT INTO transactions (id, userId, description, amount, date, type, categoryId, monthYear, note, performedBy, paymentSource)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      transaction.id,
      transaction.userId,
      transaction.description,
      transaction.amount,
      transaction.date,
      transaction.type,
      transaction.categoryId,
      transaction.monthYear,
      transaction.note || null, // Ensure null if undefined
      transaction.performedBy,
      transaction.paymentSource || null // Ensure null if undefined
    );
    console.log(`[API_SQLite /transactions] Successfully inserted transaction ID ${transaction.id} into DB.`);
    return transaction;
  } catch (error: any) {
    console.error(`[API_SQLite /transactions] Error in addTransactionToDb for transaction ID ${transaction.id}:`, error.message, error.stack);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  console.log(`[API_SQLite /transactions] GET request received: ${request.url}`);
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') as UserType | null;
  const monthYearParam = searchParams.get('monthYear');

  if (!userId || !monthYearParam) {
    console.error("[API_SQLite /transactions GET] Missing userId or monthYear query parameters.");
    return NextResponse.json({ message: 'userId (familyId) and monthYear query parameters are required' }, { status: 400 });
  }
   if (userId !== FAMILY_ACCOUNT_ID) {
    console.warn(`[API_SQLite /transactions GET] Requested userId "${userId}" does not match FAMILY_ACCOUNT_ID "${FAMILY_ACCOUNT_ID}". This might be okay if fetching other user's data is intended, but for family budget, usually FAMILY_ACCOUNT_ID is used.`);
    // Depending on policy, you might want to enforce userId === FAMILY_ACCOUNT_ID here or adjust the query
  }


  try {
    console.log(`[API_SQLite /transactions GET] Fetching transactions for userId: ${userId}, monthYear: ${monthYearParam}`);
    const transactions = await getTransactionsFromDb(userId, monthYearParam);
    console.log(`[API_SQLite /transactions GET] Successfully fetched ${transactions.length} transactions.`);
    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('[API_SQLite /transactions GET] Error processing GET request:', error.message, error.stack);
    const message = error.message || 'Failed to fetch data from SQLite.';
    let statusCode = typeof error.code === 'number' && error.code >= 200 && error.code <= 599 ? error.code : 500;
    return NextResponse.json({ message, details: error.stack }, { status: statusCode });
  }
}

export async function POST(request: NextRequest) {
  console.log(`[API_SQLite /transactions] POST request received.`);
  try {
    const transaction = await request.json() as Transaction;
    console.log(`[API_SQLite /transactions POST] Received transaction data for ID: ${transaction.id}, UserID: ${transaction.userId}, PerformedBy: ${transaction.performedBy}`);

    if (!transaction || typeof transaction !== 'object') {
        console.error("[API_SQLite /transactions POST] Invalid transaction data in request body: not an object.");
        return NextResponse.json({ message: 'Invalid transaction data in request body' }, { status: 400 });
    }
    if (!transaction.id || !transaction.userId || !transaction.description || transaction.amount === undefined || !transaction.date || !transaction.type || !transaction.categoryId || !transaction.monthYear || !transaction.performedBy || !transaction.paymentSource) {
        console.error("[API_SQLite /transactions POST] Missing required fields in transaction data. Data:", transaction);
        return NextResponse.json({ message: 'Missing required fields in transaction data (ensure id, userId, description, amount, date, type, categoryId, monthYear, performedBy, paymentSource are included)' }, { status: 400 });
    }
     if (transaction.userId !== FAMILY_ACCOUNT_ID) {
      console.warn(`[API_SQLite /transactions POST] Incoming transaction userId "${transaction.userId}" does not match FAMILY_ACCOUNT_ID "${FAMILY_ACCOUNT_ID}". Overwriting userId to ${FAMILY_ACCOUNT_ID}.`);
      transaction.userId = FAMILY_ACCOUNT_ID;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(transaction.date)) {
        console.error("[API_SQLite /transactions POST] Invalid date format. Expected YYYY-MM-DD. Data:", transaction.date);
        return NextResponse.json({ message: 'Invalid date format. Expected YYYY-MM-DD.' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}$/.test(transaction.monthYear)) {
        console.error("[API_SQLite /transactions POST] Invalid monthYear format. Expected YYYY-MM. Data:", transaction.monthYear);
        return NextResponse.json({ message: 'Invalid monthYear format. Expected YYYY-MM.' }, { status: 400 });
    }
    // Ensure amount is a number
    transaction.amount = Number(transaction.amount);
    if (isNaN(transaction.amount)) {
        console.error("[API_SQLite /transactions POST] Invalid amount. Not a number. Data:", transaction.amount);
        return NextResponse.json({ message: 'Invalid amount. Must be a number.' }, { status: 400 });
    }


    console.log(`[API_SQLite /transactions POST] Adding transaction ID ${transaction.id} to DB.`);
    const savedTransaction = await addTransactionToDb(transaction);
    console.log(`[API_SQLite /transactions POST] Successfully added transaction ID ${transaction.id}.`);
    return NextResponse.json(savedTransaction, { status: 201 });

  } catch (error: any) {
    console.error('[API_SQLite /transactions POST] Error processing POST request:', error.message, error.stack);
    if (error instanceof SyntaxError) { // Catch JSON parsing errors for request body
        console.error("[API_SQLite /transactions POST] Invalid JSON in request body.");
        return NextResponse.json({ message: 'Invalid JSON in request body' }, { status: 400 });
    }
    // Check for SQLite specific unique constraint error
    if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' || (error.message && error.message.toLowerCase().includes('unique constraint failed: transactions.id'))) {
        console.error(`[API_SQLite /transactions POST] Unique constraint violation for ID ${ (JSON.parse(request.headers.get('X-Original-Request-Body') || '{}') as Transaction).id || 'unknown'}:`, error.message);
        return NextResponse.json({ message: `Transaction with this ID already exists. ID: ${(JSON.parse(request.headers.get('X-Original-Request-Body') || '{}') as Transaction).id || 'unknown'}`, details: error.message }, { status: 409 }); // 409 Conflict
    }
    const message = error.message || 'Failed to add transaction to SQLite.';
    let statusCode = typeof error.code === 'number' && error.code >= 200 && error.code <= 599 ? error.code : 500;
    return NextResponse.json({ message, details: error.stack }, { status: statusCode });
  }
}
