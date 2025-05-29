
import { type NextRequest, NextResponse } from 'next/server';
import type { Transaction, UserType } from '@/types';
// TODO: Uncomment and configure when Google Sheets API is set up
// import { google } from 'googleapis'; 

// --- Google Sheets Configuration (Replace with your actual setup) ---
// TODO: Store these securely in environment variables
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID; 
const SHEET_NAME = 'Transactions'; // Or your specific sheet name

// TODO: Set up authentication (Service Account or OAuth 2.0)
// Example for Service Account (ensure the JSON key file is correctly referenced and secured)
/*
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, // Path to your service account key file
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });
*/

// --- Helper Functions (Illustrative - Implement actual Sheet interaction) ---

async function getTransactionsFromSheet(userId: UserType, monthYear: string): Promise<Transaction[]> {
  console.log(`Mock: Fetching transactions for ${userId} in ${monthYear} from Google Sheet ID: ${SPREADSHEET_ID}`);
  // TODO: Implement actual Google Sheets API call to read data
  // 1. Authenticate with Google Sheets API.
  // 2. Construct the range to read (e.g., based on userId and monthYear if you have columns for these).
  // 3. Call sheets.spreadsheets.values.get().
  // 4. Parse the rows into Transaction objects.
  // Example: If sheet has columns: ID, UserID, Description, Amount, Date, Type, CategoryID, MonthYear
  /*
  if (!SPREADSHEET_ID) throw new Error("Google Sheet ID not configured.");
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:H`, // Adjust range as needed
    });
    const rows = response.data.values;
    if (rows && rows.length) {
      return rows
        .slice(1) // Skip header row
        .map((row): Transaction | null => {
          // Ensure row has enough columns and data types are correct
          if (row.length < 8) return null;
          if (row[1] === userId && row[7] === monthYear) { // Filter by userId and monthYear
            return {
              id: row[0],
              userId: row[1] as UserType,
              description: row[2],
              amount: parseFloat(row[3]),
              date: row[4], // Assuming date is stored as YYYY-MM-DD string
              type: row[5] as 'income' | 'expense',
              categoryId: row[6],
              monthYear: row[7],
            };
          }
          return null;
        })
        .filter((t): t is Transaction => t !== null);
    }
    return [];
  } catch (err) {
    console.error('Error fetching from Google Sheets:', err);
    throw new Error('Failed to fetch data from Google Sheets.');
  }
  */
  // Placeholder: return empty array
  return Promise.resolve([]);
}

async function addTransactionToSheet(transaction: Transaction): Promise<Transaction> {
  console.log('Mock: Adding transaction to Google Sheet:', transaction, `(Sheet ID: ${SPREADSHEET_ID})`);
  // TODO: Implement actual Google Sheets API call to append data
  // 1. Authenticate with Google Sheets API.
  // 2. Prepare the row data from the transaction object.
  // 3. Call sheets.spreadsheets.values.append().
  /*
  if (!SPREADSHEET_ID) throw new Error("Google Sheet ID not configured.");
  try {
    const values = [[
      transaction.id,
      transaction.userId,
      transaction.description,
      transaction.amount,
      transaction.date,
      transaction.type,
      transaction.categoryId,
      transaction.monthYear,
    ]];
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:H`, // Append to the end of the sheet
      valueInputOption: 'USER_ENTERED', // Or 'RAW'
      requestBody: { values },
    });
    return transaction; // Return the transaction as confirmation
  } catch (err) {
    console.error('Error appending to Google Sheets:', err);
    throw new Error('Failed to save data to Google Sheets.');
  }
  */
  // Placeholder: return the transaction
  return Promise.resolve(transaction);
}

// --- API Route Handlers ---

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') as UserType | null;
  const monthYear = searchParams.get('monthYear');

  if (!userId || !monthYear) {
    return NextResponse.json({ message: 'userId and monthYear query parameters are required' }, { status: 400 });
  }

  try {
    // TODO: Replace with actual Google Sheets fetching logic
    // For now, this will use the mock implementation which logs and returns an empty array.
    // You need to set up Google Cloud, enable Sheets API, and provide credentials.
    const transactions = await getTransactionsFromSheet(userId, monthYear);
    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('[API GET /transactions] Error:', error);
    return NextResponse.json({ message: error.message || 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const transaction = await request.json() as Transaction;

    if (!transaction || typeof transaction !== 'object') {
        return NextResponse.json({ message: 'Invalid transaction data in request body' }, { status: 400 });
    }
    // Basic validation (can be enhanced with Zod)
    if (!transaction.userId || !transaction.description || !transaction.amount || !transaction.date || !transaction.type || !transaction.categoryId || !transaction.monthYear) {
        return NextResponse.json({ message: 'Missing required fields in transaction data' }, { status: 400 });
    }
    
    // TODO: Replace with actual Google Sheets adding logic
    // For now, this will use the mock implementation which logs and returns the transaction.
    // You need to set up Google Cloud, enable Sheets API, and provide credentials.
    const savedTransaction = await addTransactionToSheet(transaction);
    return NextResponse.json(savedTransaction, { status: 201 });

  } catch (error: any) {
    console.error('[API POST /transactions] Error:', error);
    if (error instanceof SyntaxError) { // JSON parsing error
        return NextResponse.json({ message: 'Invalid JSON in request body' }, { status: 400 });
    }
    return NextResponse.json({ message: error.message || 'Failed to add transaction' }, { status: 500 });
  }
}
