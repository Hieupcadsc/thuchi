
import { type NextRequest, NextResponse } from 'next/server';
import type { Transaction, UserType } from '@/types';
import { google } from 'googleapis';

// --- Google Sheets Configuration ---
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// --- Authentication ---
// GOOGLE_APPLICATION_CREDENTIALS environment variable should be set to the path of your service account key file.
// e.g., GOOGLE_APPLICATION_CREDENTIALS=./.secure/service-account-key.json
const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

const HEADER_ROW = ['ID', 'UserID', 'Description', 'Amount', 'Date', 'Type', 'CategoryID', 'MonthYear'];

// --- Helper Functions ---

/**
 * Ensures a sheet (tab) for the given monthYear exists in the spreadsheet.
 * If it doesn't exist, it creates the sheet and adds a header row.
 * @param spreadsheetId The ID of the Google Spreadsheet.
 * @param sheetName The name of the sheet (e.g., "2024-07").
 */
async function ensureSheetExistsAndHeader(spreadsheetId: string, sheetName: string) {
  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetExists = spreadsheet.data.sheets?.some(
      (s) => s.properties?.title === sheetName
    );

    if (!sheetExists) {
      // Create the sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });
      // Add header row to the new sheet
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [HEADER_ROW],
        },
      });
    } else {
      // Check if header exists, if not, add it (e.g., if sheet was created manually or empty)
      const headerCheck = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:H1`,
      });
      if (!headerCheck.data.values || headerCheck.data.values.length === 0 || 
          (headerCheck.data.values[0] && headerCheck.data.values[0].join(',') !== HEADER_ROW.join(','))) {
        // Clear the first row if it exists but is not the correct header
        if (headerCheck.data.values && headerCheck.data.values.length > 0) {
            await sheets.spreadsheets.values.clear({
                spreadsheetId,
                range: `${sheetName}!A1:H1`,
            });
        }
        await sheets.spreadsheets.values.update({ // Use update to be sure it's in the first row
          spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [HEADER_ROW],
          },
        });
      }
    }
  } catch (error: any) {
    console.error(`Error in ensureSheetExistsAndHeader for sheet "${sheetName}":`, error.message, error.stack);
    // Re-throw the original error to provide more specific details downstream
    throw error;
  }
}

async function getTransactionsFromSheet(userId: UserType, monthYear: string): Promise<Transaction[]> {
  if (!SPREADSHEET_ID) {
    console.error("Google Sheet ID not configured in environment variables.");
    throw new Error("Google Sheet ID not configured.");
  }

  const sheetName = monthYear; // e.g., "2024-07"

  try {
    await ensureSheetExistsAndHeader(SPREADSHEET_ID, sheetName);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:H`, // Read all data from columns A to H
    });

    const rows = response.data.values;
    if (rows && rows.length > 1) { // More than just a header row
      return rows
        .slice(1) // Skip header row
        .map((row): Transaction | null => {
          if (row.length < 8) return null; // Ensure enough columns
          // Filter by userId (column B, index 1)
          if (row[1] === userId) {
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
  } catch (err: any) {
    console.error(`Error in getTransactionsFromSheet for sheet "${sheetName}":`, err.message, err.stack);
    // If sheet doesn't exist, it might throw an error that ensureSheetExistsAndHeader didn't catch or handle
    // For example, if ensureSheetExistsAndHeader fails itself.
    if (err.message && (err.message.includes("No sheet with the name") || err.message.includes("Unable to parse range"))) {
        console.warn(`Sheet "${sheetName}" not found or range invalid, returning empty array.`);
        return []; // Treat as no data if sheet specifically not found after attempt to create
    }
    // Re-throw the original error to provide more specific details downstream
    throw err;
  }
}

async function addTransactionToSheet(transaction: Transaction): Promise<Transaction> {
  if (!SPREADSHEET_ID) {
    console.error("Google Sheet ID not configured in environment variables.");
    throw new Error("Google Sheet ID not configured.");
  }

  const sheetName = transaction.monthYear; // e.g., "2024-07"

  try {
    await ensureSheetExistsAndHeader(SPREADSHEET_ID, sheetName);

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
      range: `${sheetName}!A:H`, // Append to the end of the specified sheet
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
    return transaction;
  } catch (err: any) {
    console.error(`Error in addTransactionToSheet for sheet "${sheetName}":`, err.message, err.stack);
    // Re-throw the original error
    throw err;
  }
}

// --- API Route Handlers ---

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') as UserType | null;
  const monthYear = searchParams.get('monthYear'); // e.g., "2024-07"

  if (!userId || !monthYear) {
    return NextResponse.json({ message: 'userId and monthYear query parameters are required' }, { status: 400 });
  }
  if (!SPREADSHEET_ID) {
    return NextResponse.json({ message: 'Google Sheet ID not configured on the server.' }, { status: 500 });
  }

  try {
    const transactions = await getTransactionsFromSheet(userId, monthYear);
    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('[API GET /transactions] Caught error:', error.message, error.stack);
    const message = error.message || 'Failed to fetch transactions';
    // Check for common Google API error structures
    if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
        //   message = error.errors[0].message || message; // Prefer more specific Google error
        // For security, we might not want to expose raw Google API error messages directly to client.
        // Logging it on server is good, but client gets a generic one unless we explicitly craft it.
        // For now, we'll use the error.message from the re-thrown error.
    }
    return NextResponse.json({ message }, { status: error.code || 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!SPREADSHEET_ID) {
    return NextResponse.json({ message: 'Google Sheet ID not configured on the server.' }, { status: 500 });
  }
  try {
    const transaction = await request.json() as Transaction;

    if (!transaction || typeof transaction !== 'object') {
        return NextResponse.json({ message: 'Invalid transaction data in request body' }, { status: 400 });
    }
    // Basic validation (can be enhanced with Zod)
    if (!transaction.id || !transaction.userId || !transaction.description || transaction.amount === undefined || !transaction.date || !transaction.type || !transaction.categoryId || !transaction.monthYear) {
        return NextResponse.json({ message: 'Missing required fields in transaction data' }, { status: 400 });
    }
    
    const savedTransaction = await addTransactionToSheet(transaction);
    return NextResponse.json(savedTransaction, { status: 201 });

  } catch (error: any) {
    console.error('[API POST /transactions] Caught error:', error.message, error.stack);
    if (error instanceof SyntaxError) { // JSON parsing error
        return NextResponse.json({ message: 'Invalid JSON in request body' }, { status: 400 });
    }
    const message = error.message || 'Failed to add transaction';
    return NextResponse.json({ message }, { status: error.code || 500 });
  }
}
