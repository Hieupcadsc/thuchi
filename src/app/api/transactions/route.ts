
import { type NextRequest, NextResponse } from 'next/server';
import type { Transaction, UserType, FamilyMember, PaymentSource } from '@/types';
import { google } from 'googleapis';
import { FAMILY_MEMBERS, PAYMENT_SOURCE_OPTIONS, FAMILY_ACCOUNT_ID } from '@/lib/constants';

// --- Google Sheets Configuration ---
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// --- Authentication ---
const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  // credentials an SPREADSHEET_ID should be loaded from env variables
});
const sheets = google.sheets({ version: 'v4', auth });

const HEADER_ROW = ['ID', 'UserID', 'Description', 'Amount', 'Date', 'Type', 'CategoryID', 'MonthYear', 'Note', 'PerformedBy', 'PaymentSource'];

// --- Helper Functions ---
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
        // It's safer to clear only if we are sure it's not empty and incorrect, to avoid clearing a sheet that might be in use.
        // For now, we'll just update. If the sheet was completely empty, update would work like append.
        // If it had data but wrong header, this update might overwrite the first row if it's not actually empty.
        // A more robust solution would check if row 1 is empty before deciding to clear or just update.
        // For now, let's assume update is generally safe.
        if (headerCheck.data.values && headerCheck.data.values.length > 0 && headerCheck.data.values[0].length > 0) {
            console.log(`[API /transactions] Existing header in "${sheetName}":`, headerCheck.data.values[0].join(','));
            console.log(`[API /transactions] Expected header:`, HEADER_ROW.join(','));
            // To be absolutely safe, one might consider not automatically "fixing" headers if data exists beyond row 1.
            // For this app, we'll assume auto-fixing is desired.
             console.log(`[API /transactions] Attempting to update header row in "${sheetName}".`);
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
    // Propagate the error so the caller knows something went wrong
    throw new Error(`Failed to ensure sheet "${sheetName}" exists with header: ${error.message}`);
  }
}

async function getTransactionsFromSheet(userIdToFetch: UserType, monthYear: string): Promise<Transaction[]> {
  console.log(`[API /transactions] getTransactionsFromSheet called for userId: ${userIdToFetch}, monthYear: ${monthYear}`);
  if (!SPREADSHEET_ID) {
    console.error("[API /transactions] Google Sheet ID not configured in environment variables for getTransactionsFromSheet.");
    throw new Error("Google Sheet ID not configured on the server.");
  }

  const sheetName = monthYear;

  try {
    await ensureSheetExistsAndHeader(SPREADSHEET_ID, sheetName);
    console.log(`[API /transactions] Ensured sheet "${sheetName}" exists. Fetching values.`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:${String.fromCharCode(64 + HEADER_ROW.length)}`, // Fetch all defined header columns
    });
    console.log(`[API /transactions] Successfully fetched values from sheet "${sheetName}". Raw response:`, response.data.values ? `${response.data.values.length} rows` : 'No values');

    const rows = response.data.values;
    if (rows && rows.length > 1) { // rows.length > 1 to skip header
      const transactions = rows
        .slice(1) // Skip header row
        .map((row, index): Transaction | null => {
          // Basic check for row integrity - should have at least enough core data
          if (row.length < 5) { // ID, UserID, Description, Amount, Date are core
            console.warn(`[API /transactions] Skipping malformed row ${index + 2} in sheet "${sheetName}": Not enough columns. Data:`, row);
            return null;
          }

          const transactionUserId = row[1];
          // For a shared family account, all transactions belong to the familyId.
          // The 'performedBy' field distinguishes who actually did it.
          // So, we should always fetch all transactions if the userIdToFetch matches the FAMILY_ACCOUNT_ID.
          if (userIdToFetch !== FAMILY_ACCOUNT_ID || transactionUserId !== FAMILY_ACCOUNT_ID) {
             // console.log(`[API /transactions] Row ${index + 2} in sheet "${sheetName}" has UserID "${transactionUserId}" which does not match requested family ID "${userIdToFetch}". Skipping.`);
            return null; 
          }

          const performedByValue = row[9] as FamilyMember | undefined;
          const isValidFamilyMember = FAMILY_MEMBERS.includes(performedByValue as FamilyMember);
          // Default to the first family member if 'performedBy' is missing or invalid for older data
          const finalPerformedBy = isValidFamilyMember ? performedByValue : FAMILY_MEMBERS[0];


          const paymentSourceValue = row[10] as PaymentSource | undefined;
          const isValidPaymentSource = PAYMENT_SOURCE_OPTIONS.find(p => p.id === paymentSourceValue);
          // Default to 'bank' if paymentSource is missing or invalid for older data
          const finalPaymentSource = isValidPaymentSource ? paymentSourceValue : 'bank';


          return {
            id: row[0] || `row-${index + 2}-${sheetName}`, // Fallback ID if missing
            userId: transactionUserId as UserType, // Should be FAMILY_ACCOUNT_ID
            description: row[2] || 'Không có mô tả',
            amount: parseFloat(row[3]) || 0,
            date: row[4] || new Date().toISOString().split('T')[0], // Fallback date
            type: row[5] as 'income' | 'expense' || 'expense', // Fallback type
            categoryId: row[6] || 'chi_phi_khac', // Fallback category
            monthYear: row[7] || monthYear, // Fallback monthYear
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
    // Handle cases where sheet might not exist or is inaccessible
    if (err.message && (err.message.includes("No sheet with the name") || err.message.includes("Unable to parse range") || err.message.includes("Requested entity was not found."))) {
        console.warn(`[API /transactions] Sheet "${sheetName}" not found or range invalid during get, returning empty array. Error: ${err.message}`);
        // It's possible ensureSheetExistsAndHeader failed silently or the sheet was deleted after check
        // Attempt to re-ensure and then return empty if still fails, or just return empty.
        // For simplicity now, just returning empty. A more robust solution might retry ensureSheetExistsAndHeader.
        return [];
    }
    throw new Error(`Failed to get transactions from sheet "${sheetName}": ${err.message}`);
  }
}

async function addTransactionToSheet(transaction: Transaction): Promise<Transaction> {
  console.log(`[API /transactions] addTransactionToSheet called for transaction ID: ${transaction.id}, monthYear: ${transaction.monthYear}`);
  if (!SPREADSHEET_ID) {
    console.error("[API /transactions] Google Sheet ID not configured in environment variables for addTransactionToSheet.");
    throw new Error("Google Sheet ID not configured on the server.");
  }

  const sheetName = transaction.monthYear;

  try {
    await ensureSheetExistsAndHeader(SPREADSHEET_ID, sheetName);
    console.log(`[API /transactions] Ensured sheet "${sheetName}" exists. Appending transaction.`);

    const values = [[
      transaction.id,
      transaction.userId, // This should be FAMILY_ACCOUNT_ID
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
    throw new Error(`Failed to add transaction to sheet "${sheetName}": ${err.message}`);
  }
}

export async function GET(request: NextRequest) {
  console.log(`[API /transactions] GET request received: ${request.url}`);
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') as UserType | null;
  const monthYear = searchParams.get('monthYear');

  if (!userId || !monthYear) {
    console.error("[API /transactions GET] Missing userId or monthYear query parameters.");
    return NextResponse.json({ message: 'userId (familyId) and monthYear query parameters are required' }, { status: 400 });
  }
  if (userId !== FAMILY_ACCOUNT_ID) {
    console.warn(`[API /transactions GET] Requested userId "${userId}" does not match FAMILY_ACCOUNT_ID "${FAMILY_ACCOUNT_ID}". Correcting.`);
    // Silently correct to FAMILY_ACCOUNT_ID or return error based on policy
    // For now, let's proceed with FAMILY_ACCOUNT_ID
  }

  if (!SPREADSHEET_ID) {
    console.error("[API /transactions GET] Google Sheet ID not configured on the server.");
    return NextResponse.json({ message: 'Google Sheet ID not configured on the server.' }, { status: 500 });
  }

  try {
    console.log(`[API /transactions GET] Fetching transactions for userId: ${FAMILY_ACCOUNT_ID}, monthYear: ${monthYear}`);
    const transactions = await getTransactionsFromSheet(FAMILY_ACCOUNT_ID, monthYear); // Always fetch for FAMILY_ACCOUNT_ID
    console.log(`[API /transactions GET] Successfully fetched ${transactions.length} transactions.`);
    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('[API /transactions GET] Error processing GET request:', error.message, error.stack);
    const message = error.message || 'Failed to fetch data from Google Sheets.';
    const statusCode = error.code || 500; // GAPI errors often have a `code` property
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
    console.log(`[API /transactions POST] Received transaction data for ID: ${transaction.id}, UserID: ${transaction.userId}, PerformedBy: ${transaction.performedBy}`);

    if (!transaction || typeof transaction !== 'object') {
        console.error("[API /transactions POST] Invalid transaction data in request body: not an object.");
        return NextResponse.json({ message: 'Invalid transaction data in request body' }, { status: 400 });
    }
    if (!transaction.id || !transaction.userId || !transaction.description || transaction.amount === undefined || !transaction.date || !transaction.type || !transaction.categoryId || !transaction.monthYear || !transaction.performedBy || !transaction.paymentSource) {
        console.error("[API /transactions POST] Missing required fields in transaction data. Data:", transaction);
        return NextResponse.json({ message: 'Missing required fields in transaction data (ensure id, userId, description, amount, date, type, categoryId, monthYear, performedBy, paymentSource are included)' }, { status: 400 });
    }
    if (transaction.userId !== FAMILY_ACCOUNT_ID) {
      console.warn(`[API /transactions POST] Incoming transaction userId "${transaction.userId}" does not match FAMILY_ACCOUNT_ID "${FAMILY_ACCOUNT_ID}". Overwriting userId.`);
      transaction.userId = FAMILY_ACCOUNT_ID; // Ensure userId is always the family ID
    }


    console.log(`[API /transactions POST] Adding transaction ID ${transaction.id} to sheet.`);
    const savedTransaction = await addTransactionToSheet(transaction);
    console.log(`[API /transactions POST] Successfully added transaction ID ${transaction.id}.`);
    return NextResponse.json(savedTransaction, { status: 201 });

  } catch (error: any) {
    console.error('[API /transactions POST] Error processing POST request:', error.message, error.stack);
    if (error instanceof SyntaxError) { // If request.json() fails
        console.error("[API /transactions POST] Invalid JSON in request body.");
        return NextResponse.json({ message: 'Invalid JSON in request body' }, { status: 400 });
    }
    const message = error.message || 'Failed to add transaction to Google Sheets.';
    const statusCode = error.code || 500;
    return NextResponse.json({ message, details: error.stack }, { status: statusCode });
  }
}
