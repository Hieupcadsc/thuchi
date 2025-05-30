
import { type NextRequest, NextResponse } from 'next/server';
import type { Transaction, UserType, FamilyMember, PaymentSource } from '@/types';
import { google } from 'googleapis';
import { FAMILY_MEMBERS, PAYMENT_SOURCE_OPTIONS, FAMILY_ACCOUNT_ID } from '@/lib/constants';

// --- Google Sheets Configuration ---
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// --- Authentication ---
const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

const HEADER_ROW = ['ID', 'UserID', 'Description', 'Amount', 'Date', 'Type', 'CategoryID', 'MonthYear', 'Note', 'PerformedBy', 'PaymentSource'];

// --- Helper Functions ---

/**
 * Converts an Excel serial number date to a YYYY-MM-DD string.
 * @param serial The Excel serial number.
 * @returns A date string in YYYY-MM-DD format.
 */
function excelSerialDateToYYYYMMDD(serial: number): string {
  const excelEpochMs = Date.UTC(1899, 11, 30); 
  const millisecondsInDay = 24 * 60 * 60 * 1000;
  const dateMs = excelEpochMs + (serial * millisecondsInDay);
  const date = new Date(dateMs);

  const year = date.getUTCFullYear(); 
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}


async function ensureSheetExistsAndHeader(spreadsheetId: string, sheetName: string) {
  console.log(`[API /transactions] ensureSheetExistsAndHeader called for sheet: ${sheetName}`);
  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    console.log(`[API /transactions] Fetched spreadsheet metadata for sheet check: ${sheetName}`);

    const sheetExists = spreadsheet.data.sheets?.some(
      (s) => s.properties?.title === sheetName
    );

    if (!sheetExists) {
      console.log(`[API /transactions] Sheet "${sheetName}" does not exist. Creating it.`);
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
      console.log(`[API /transactions] Sheet "${sheetName}" created. Appending header row.`);
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [HEADER_ROW],
        },
      });
      console.log(`[API /transactions] Header row appended to "${sheetName}".`);
    } else {
      console.log(`[API /transactions] Sheet "${sheetName}" exists. Checking header.`);
      const headerCheck = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:${String.fromCharCode(64 + HEADER_ROW.length)}1`,
      });
      if (!headerCheck.data.values || headerCheck.data.values.length === 0 ||
          (headerCheck.data.values[0] && headerCheck.data.values[0].join(',') !== HEADER_ROW.join(','))) {
        console.warn(`[API /transactions] Header row in "${sheetName}" is missing or incorrect. Attempting to fix.`);
        if (headerCheck.data.values && headerCheck.data.values.length > 0 && headerCheck.data.values[0].length > 0) {
            console.log(`[API /transactions] Existing header in "${sheetName}":`, headerCheck.data.values[0].join(','));
            console.log(`[API /transactions] Expected header:`, HEADER_ROW.join(','));
        } else {
             console.log(`[API /transactions] Header row in "${sheetName}" is empty or malformed. Attempting to set header.`);
        }
        
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [HEADER_ROW],
          },
        });
        console.log(`[API /transactions] Header row updated/set in "${sheetName}".`);
      } else {
        console.log(`[API /transactions] Header row in "${sheetName}" is correct.`);
      }
    }
    console.log(`[API /transactions] ensureSheetExistsAndHeader completed for sheet: ${sheetName}`);
  } catch (error: any) {
    console.error(`[API /transactions] Error in ensureSheetExistsAndHeader for sheet "${sheetName}":`, error.message, error.stack);
    const message = error.errors?.[0]?.message || error.message || `Failed to ensure sheet "${sheetName}" exists with header.`;
    // Rethrow with specific code if available
    throw Object.assign(new Error(message), { code: error.code, details: error.stack });
  }
}

async function getTransactionsFromSheet(userIdToFetch: UserType, monthYear: string): Promise<Transaction[]> {
  console.log(`[API /transactions] getTransactionsFromSheet called for userId: ${userIdToFetch}, monthYear: ${monthYear}`);
  if (!SPREADSHEET_ID) {
    console.error("[API /transactions] Google Sheet ID not configured in environment variables for getTransactionsFromSheet.");
    throw Object.assign(new Error("Google Sheet ID not configured on the server."), { code: 500 });
  }

  const sheetName = monthYear;

  try {
    await ensureSheetExistsAndHeader(SPREADSHEET_ID, sheetName);
    console.log(`[API /transactions] Ensured sheet "${sheetName}" exists. Fetching values.`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:${String.fromCharCode(64 + HEADER_ROW.length)}`,
      valueRenderOption: 'UNFORMATTED_VALUE', 
      dateTimeRenderOption: 'SERIAL_NUMBER', 
    });
    console.log(`[API /transactions] Successfully fetched values from sheet "${sheetName}". Raw response:`, response.data.values ? `${response.data.values.length} rows` : 'No values');

    const rows = response.data.values;
    if (rows && rows.length > 1) { 
      const transactions = rows
        .slice(1) 
        .map((row, index): Transaction | null => {
          if (row.length < HEADER_ROW.length) { 
            console.warn(`[API /transactions] Skipping malformed row ${index + 2} in sheet "${sheetName}": Expected ${HEADER_ROW.length} columns, got ${row.length}. Data:`, row);
            return null;
          }

          const transactionUserId = row[1];
          if (userIdToFetch === FAMILY_ACCOUNT_ID && transactionUserId !== FAMILY_ACCOUNT_ID) {
            console.warn(`[API /transactions] Skipping row ${index + 2} for user ${transactionUserId} as we are fetching for family account ${FAMILY_ACCOUNT_ID}`);
            return null;
          }
          if (userIdToFetch !== FAMILY_ACCOUNT_ID && transactionUserId !== userIdToFetch) {
             console.warn(`[API /transactions] Skipping row ${index + 2} for user ${transactionUserId} as we are fetching for specific user ${userIdToFetch}`);
            return null;
          }


          let dateValue = row[4];
          if (typeof dateValue === 'number') {
            dateValue = excelSerialDateToYYYYMMDD(dateValue);
          } else if (typeof dateValue !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
             console.warn(`[API /transactions] Row ${index + 2} in sheet "${sheetName}" has an unexpected date format: ${row[4]}. Falling back.`);
             dateValue = new Date().toISOString().split('T')[0];
          }


          const performedByValue = row[9] as FamilyMember | undefined;
          const isValidFamilyMember = FAMILY_MEMBERS.includes(performedByValue as FamilyMember);
          const finalPerformedBy = isValidFamilyMember ? performedByValue : FAMILY_MEMBERS[0];

          const paymentSourceValue = row[10] as PaymentSource | undefined;
          const isValidPaymentSource = PAYMENT_SOURCE_OPTIONS.find(p => p.id === paymentSourceValue);
          const finalPaymentSource = isValidPaymentSource ? paymentSourceValue : 'bank';

          return {
            id: row[0] || `row-${index + 2}-${sheetName}`,
            userId: transactionUserId as UserType,
            description: row[2] || 'Không có mô tả',
            amount: parseFloat(row[3]) || 0,
            date: dateValue as string, 
            type: row[5] as 'income' | 'expense' || 'expense',
            categoryId: row[6] || 'chi_phi_khac',
            monthYear: monthYear, 
            note: row[8] || undefined,
            performedBy: finalPerformedBy,
            paymentSource: finalPaymentSource,
          };
        })
        .filter((t): t is Transaction => t !== null);
      console.log(`[API /transactions] Parsed ${transactions.length} transactions from sheet "${sheetName}".`);
      return transactions;
    }
    console.log(`[API /transactions] No data rows found in sheet "${sheetName}" or only header exists.`);
    return [];
  } catch (err: any) {
    console.error(`[API /transactions] Error in getTransactionsFromSheet for sheet "${sheetName}":`, err.message, err.stack);
    if (err.message && (err.message.includes("No sheet with the name") || err.message.includes("Unable to parse range") || err.message.includes("Requested entity was not found."))) {
        console.warn(`[API /transactions] Sheet "${sheetName}" not found or range invalid during get, returning empty array. Error: ${err.message}`);
        return []; // Return empty if sheet doesn't exist, it will be created on next POST
    }
    const message = err.errors?.[0]?.message || err.message || `Failed to get transactions from sheet "${sheetName}".`;
    throw Object.assign(new Error(message), { code: err.code, details: err.stack });
  }
}

async function addTransactionToSheet(transaction: Transaction): Promise<Transaction> {
  console.log(`[API /transactions] addTransactionToSheet called for transaction ID: ${transaction.id}, monthYear: ${transaction.monthYear}`);
  if (!SPREADSHEET_ID) {
    console.error("[API /transactions] Google Sheet ID not configured in environment variables for addTransactionToSheet.");
    throw Object.assign(new Error("Google Sheet ID not configured on the server."), { code: 500 });
  }

  const sheetName = transaction.monthYear;

  try {
    await ensureSheetExistsAndHeader(SPREADSHEET_ID, sheetName);
    console.log(`[API /transactions] Ensured sheet "${sheetName}" exists. Appending transaction.`);

    const values = [[
      transaction.id,
      transaction.userId,
      transaction.description,
      transaction.amount,
      transaction.date, 
      transaction.type,
      transaction.categoryId,
      transaction.monthYear, 
      transaction.note || '',
      transaction.performedBy,
      transaction.paymentSource || '',
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:${String.fromCharCode(64 + HEADER_ROW.length)}`,
      valueInputOption: 'USER_ENTERED', 
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
    console.log(`[API /transactions] Successfully appended transaction ID ${transaction.id} to sheet "${sheetName}".`);
    return transaction;
  } catch (err: any) {
    console.error(`[API /transactions] Error in addTransactionToSheet for sheet "${sheetName}", transaction ID ${transaction.id}:`, err.message, err.stack);
    const message = err.errors?.[0]?.message || err.message || `Failed to add transaction to sheet "${sheetName}".`;
    throw Object.assign(new Error(message), { code: err.code, details: err.stack });
  }
}

export async function GET(request: NextRequest) {
  console.log(`[API /transactions] GET request received: ${request.url}`);
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') as UserType | null;
  const monthYearParam = searchParams.get('monthYear');

  if (!userId || !monthYearParam) {
    console.error("[API /transactions GET] Missing userId or monthYear query parameters.");
    return NextResponse.json({ message: 'userId (familyId) and monthYear query parameters are required' }, { status: 400 });
  }
  if (userId !== FAMILY_ACCOUNT_ID) {
    console.warn(`[API /transactions GET] Requested userId "${userId}" does not match FAMILY_ACCOUNT_ID "${FAMILY_ACCOUNT_ID}". This might be okay if fetching other user's data is intended, but for family budget, usually FAMILY_ACCOUNT_ID is used.`);
  }

  if (!SPREADSHEET_ID) {
    console.error("[API /transactions GET] Google Sheet ID not configured on the server.");
    return NextResponse.json({ message: 'Google Sheet ID not configured on the server.' }, { status: 500 });
  }

  try {
    console.log(`[API /transactions GET] Fetching transactions for userId: ${userId}, monthYear: ${monthYearParam}`);
    const transactions = await getTransactionsFromSheet(userId, monthYearParam);
    console.log(`[API /transactions GET] Successfully fetched ${transactions.length} transactions.`);
    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('[API /transactions GET] Error processing GET request:', error.message, error.stack);
    const message = error.message || 'Failed to fetch data from Google Sheets.';
    const statusCode = error.code || 500;
    return NextResponse.json({ message, details: error.stack }, { status: statusCode });
  }
}

export async function POST(request: NextRequest) {
  console.log(`[API /transactions] POST request received.`);
  if (!SPREADSHEET_ID) {
    console.error("[API /transactions POST] Google Sheet ID not configured on the server.");
    return NextResponse.json({ message: 'Google Sheet ID not configured on the server.' }, { status: 500 });
  }
  try {
    const transaction = await request.json() as Transaction;
    console.log(`[API /transactions POST] Received transaction data for ID: ${transaction.id}, UserID: ${transaction.userId}, PerformedBy: ${transaction.performedBy}, PaymentSource: ${transaction.paymentSource}`);

    if (!transaction || typeof transaction !== 'object') {
        console.error("[API /transactions POST] Invalid transaction data in request body: not an object.");
        return NextResponse.json({ message: 'Invalid transaction data in request body' }, { status: 400 });
    }
    if (!transaction.id || !transaction.userId || !transaction.description || transaction.amount === undefined || !transaction.date || !transaction.type || !transaction.categoryId || !transaction.monthYear || !transaction.performedBy || !transaction.paymentSource) {
        console.error("[API /transactions POST] Missing required fields in transaction data. Data:", transaction);
        return NextResponse.json({ message: 'Missing required fields in transaction data (ensure id, userId, description, amount, date, type, categoryId, monthYear, performedBy, paymentSource are included)' }, { status: 400 });
    }
    if (transaction.userId !== FAMILY_ACCOUNT_ID) {
      console.warn(`[API /transactions POST] Incoming transaction userId "${transaction.userId}" does not match FAMILY_ACCOUNT_ID "${FAMILY_ACCOUNT_ID}". Overwriting userId to ${FAMILY_ACCOUNT_ID}.`);
      transaction.userId = FAMILY_ACCOUNT_ID;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(transaction.date)) {
        console.error("[API /transactions POST] Invalid date format. Expected YYYY-MM-DD. Data:", transaction.date);
        return NextResponse.json({ message: 'Invalid date format. Expected YYYY-MM-DD.' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}$/.test(transaction.monthYear)) {
        console.error("[API /transactions POST] Invalid monthYear format. Expected YYYY-MM. Data:", transaction.monthYear);
        return NextResponse.json({ message: 'Invalid monthYear format. Expected YYYY-MM.' }, { status: 400 });
    }

    console.log(`[API /transactions POST] Adding transaction ID ${transaction.id} to sheet.`);
    const savedTransaction = await addTransactionToSheet(transaction);
    console.log(`[API /transactions POST] Successfully added transaction ID ${transaction.id}.`);
    return NextResponse.json(savedTransaction, { status: 201 });

  } catch (error: any) {
    console.error('[API /transactions POST] Error processing POST request:', error.message, error.stack);
    if (error instanceof SyntaxError) { // Catch JSON parsing errors for request body
        console.error("[API /transactions POST] Invalid JSON in request body.");
        return NextResponse.json({ message: 'Invalid JSON in request body' }, { status: 400 });
    }
    const message = error.message || 'Failed to add transaction to Google Sheets.';
    const statusCode = error.code || 500;
    return NextResponse.json({ message, details: error.stack }, { status: statusCode });
  }
}
