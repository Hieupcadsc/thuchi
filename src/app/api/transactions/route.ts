
import { type NextRequest, NextResponse } from 'next/server';
import type { Transaction, UserType } from '@/types';
import { google } from 'googleapis';

// --- Google Sheets Configuration ---
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// --- Authentication ---
const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

const HEADER_ROW = ['ID', 'UserID', 'Description', 'Amount', 'Date', 'Type', 'CategoryID', 'MonthYear', 'Note'];

// --- Helper Functions ---
async function ensureSheetExistsAndHeader(spreadsheetId: string, sheetName: string) {
  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetExists = spreadsheet.data.sheets?.some(
      (s) => s.properties?.title === sheetName
    );

    if (!sheetExists) {
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
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [HEADER_ROW],
        },
      });
    } else {
      const headerCheck = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:I1`,
      });
      if (!headerCheck.data.values || headerCheck.data.values.length === 0 || 
          (headerCheck.data.values[0] && headerCheck.data.values[0].join(',') !== HEADER_ROW.join(','))) {
        if (headerCheck.data.values && headerCheck.data.values.length > 0) {
            await sheets.spreadsheets.values.clear({
                spreadsheetId,
                range: `${sheetName}!A1:I1`,
            });
        }
        await sheets.spreadsheets.values.update({
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
    throw error; // Re-throw to be caught by handler
  }
}

async function getTransactionsFromSheet(userIdToFetch: UserType, monthYear: string): Promise<Transaction[]> {
  if (!SPREADSHEET_ID) {
    console.error("Google Sheet ID not configured in environment variables.");
    throw new Error("Google Sheet ID not configured.");
  }

  const sheetName = monthYear;

  try {
    await ensureSheetExistsAndHeader(SPREADSHEET_ID, sheetName);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:I`,
    });

    const rows = response.data.values;
    if (rows && rows.length > 1) {
      return rows
        .slice(1)
        .map((row): Transaction | null => {
          if (row.length < HEADER_ROW.length -1 && row.length < 8) return null;
          // Filter by userId (column B, index 1) - this userId is now the familyId
          if (row[1] === userIdToFetch) {
            return {
              id: row[0],
              userId: row[1] as UserType,
              description: row[2],
              amount: parseFloat(row[3]),
              date: row[4],
              type: row[5] as 'income' | 'expense',
              categoryId: row[6],
              monthYear: row[7],
              note: row[8] || undefined,
            };
          }
          return null;
        })
        .filter((t): t is Transaction => t !== null);
    }
    return [];
  } catch (err: any) {
    console.error(`Error in getTransactionsFromSheet for sheet "${sheetName}":`, err.message, err.stack);
    if (err.message && (err.message.includes("No sheet with the name") || err.message.includes("Unable to parse range"))) {
        console.warn(`Sheet "${sheetName}" not found or range invalid, returning empty array.`);
        return []; 
    }
    throw err; // Re-throw to be caught by handler
  }
}

async function addTransactionToSheet(transaction: Transaction): Promise<Transaction> {
  if (!SPREADSHEET_ID) {
    console.error("Google Sheet ID not configured in environment variables.");
    throw new Error("Google Sheet ID not configured.");
  }

  const sheetName = transaction.monthYear;

  try {
    await ensureSheetExistsAndHeader(SPREADSHEET_ID, sheetName);

    const values = [[
      transaction.id,
      transaction.userId, // This will be the familyId
      transaction.description,
      transaction.amount,
      transaction.date,
      transaction.type,
      transaction.categoryId,
      transaction.monthYear,
      transaction.note || '',
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:I`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
    return transaction;
  } catch (err: any) {
    console.error(`Error in addTransactionToSheet for sheet "${sheetName}":`, err.message, err.stack);
    throw err; // Re-throw to be caught by handler
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') as UserType | null; // This will be the familyId
  const monthYear = searchParams.get('monthYear');

  if (!userId || !monthYear) {
    return NextResponse.json({ message: 'userId (familyId) and monthYear query parameters are required' }, { status: 400 });
  }
  if (!SPREADSHEET_ID) {
    return NextResponse.json({ message: 'Google Sheet ID not configured on the server.' }, { status: 500 });
  }

  try {
    const transactions = await getTransactionsFromSheet(userId, monthYear);
    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('[API GET /transactions] Error:', error.message, error.stack);
    const message = error.message || 'Failed to fetch data from Google Sheets.';
    const statusCode = error.code || 500; // Use specific error code if available
    return NextResponse.json({ message }, { status: statusCode });
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
    if (!transaction.id || !transaction.userId || !transaction.description || transaction.amount === undefined || !transaction.date || !transaction.type || !transaction.categoryId || !transaction.monthYear) {
        return NextResponse.json({ message: 'Missing required fields in transaction data' }, { status: 400 });
    }
    
    const savedTransaction = await addTransactionToSheet(transaction);
    return NextResponse.json(savedTransaction, { status: 201 });

  } catch (error: any) {
    console.error('[API POST /transactions] Error:', error.message, error.stack);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'Invalid JSON in request body' }, { status: 400 });
    }
    const message = error.message || 'Failed to add transaction to Google Sheets.';
    const statusCode = error.code || 500;
    return NextResponse.json({ message }, { status: statusCode });
  }
}
