
import { type NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import type { Transaction, PaymentSource } from '@/types';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

const HEADER_ROW = ['ID', 'UserID', 'Description', 'Amount', 'Date', 'Type', 'CategoryID', 'MonthYear', 'Note', 'PerformedBy', 'PaymentSource'];


async function findRowById(spreadsheetId: string, sheetName: string, transactionId: string): Promise<number | null> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`, 
    });
    const rows = response.data.values;
    if (rows) {
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][0] === transactionId) {
          return i + 1; 
        }
      }
    }
    return null;
  } catch (error: any) {
    console.error(`Error finding row by ID ${transactionId} in sheet ${sheetName}:`, error.message, error.stack);
    if (error.message && (error.message.includes("No sheet with the name") || error.message.includes("Unable to parse range") || error.message.includes("Requested entity was not found."))) {
        return null; // If sheet doesn't exist, no row can be found
    }
    const message = error.errors?.[0]?.message || error.message || `Failed to find transaction ID ${transactionId} in sheet ${sheetName}.`;
    throw Object.assign(new Error(message), { code: error.code, details: error.stack });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { transactionId: string } }) {
  if (!SPREADSHEET_ID) {
    return NextResponse.json({ message: 'Google Sheet ID not configured on the server.' }, { status: 500 });
  }
  const { transactionId } = params;
  try {
    const updatedTransactionData = await request.json() as Transaction;

    if (updatedTransactionData.id !== transactionId) {
        return NextResponse.json({ message: 'Transaction ID in path does not match ID in body.' }, { status: 400 });
    }
    if (!updatedTransactionData.monthYear) {
        return NextResponse.json({ message: 'monthYear is required in transaction data for update.' }, { status: 400 });
    }
    if (!updatedTransactionData.paymentSource) { // Ensure paymentSource is present
        return NextResponse.json({ message: 'paymentSource is required in transaction data for update.' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(updatedTransactionData.date)) {
        return NextResponse.json({ message: 'Invalid date format. Expected YYYY-MM-DD.' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}$/.test(updatedTransactionData.monthYear)) {
        return NextResponse.json({ message: 'Invalid monthYear format. Expected YYYY-MM.' }, { status: 400 });
    }

    const sheetName = updatedTransactionData.monthYear;
    const rowIndex = await findRowById(SPREADSHEET_ID, sheetName, transactionId);

    if (!rowIndex) {
      return NextResponse.json({ message: `Transaction with ID ${transactionId} not found in sheet ${sheetName}.` }, { status: 404 });
    }

    const values = [[
      updatedTransactionData.id,
      updatedTransactionData.userId,
      updatedTransactionData.description,
      updatedTransactionData.amount,
      updatedTransactionData.date,
      updatedTransactionData.type,
      updatedTransactionData.categoryId,
      updatedTransactionData.monthYear,
      updatedTransactionData.note || '',
      updatedTransactionData.performedBy,
      updatedTransactionData.paymentSource || '', // Ensure paymentSource is written
    ]];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A${rowIndex}:${String.fromCharCode(64 + HEADER_ROW.length)}${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    return NextResponse.json(updatedTransactionData);
  } catch (error: any) {
    console.error(`[API PUT /transactions/${transactionId}] Error:`, error.message, error.stack);
    const message = error.errors?.[0]?.message || error.message || 'Failed to update transaction.';
    const statusCode = error.code || 500;
    return NextResponse.json({ message, details: error.stack }, { status: statusCode });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { transactionId: string } }) {
  if (!SPREADSHEET_ID) {
    return NextResponse.json({ message: 'Google Sheet ID not configured on the server.' }, { status: 500 });
  }
  const { transactionId } = params;
  const { searchParams } = new URL(request.url);
  const monthYear = searchParams.get('monthYear');

  if (!monthYear) {
    return NextResponse.json({ message: 'monthYear query parameter is required for deletion.' }, { status: 400 });
  }

  try {
    const sheetName = monthYear;
    
    // Try to get sheetId, but proceed even if it fails initially, findRowById will also check sheet existence.
    let sheetId;
    try {
        const sheetData = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID, ranges: [sheetName] });
        sheetId = sheetData.data.sheets?.find(s => s.properties?.title === sheetName)?.properties?.sheetId;
    } catch (getSheetError: any) {
        // If sheet doesn't exist, findRowById will return null, and we'll handle it there.
        console.warn(`[API DELETE /transactions/${transactionId}] Could not get sheet metadata for ${sheetName}, possibly it doesn't exist. Error: ${getSheetError.message}`);
    }


    const rowIndex = await findRowById(SPREADSHEET_ID, sheetName, transactionId);

    if (!rowIndex) {
      return NextResponse.json({ message: `Transaction with ID ${transactionId} not found in sheet ${sheetName}.` }, { status: 404 });
    }
    
    // Re-fetch sheetId if it wasn't found before, now that we know the sheet and row exist
    if (sheetId === undefined) {
        const sheetDataRetry = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID, ranges: [sheetName] });
        sheetId = sheetDataRetry.data.sheets?.find(s => s.properties?.title === sheetName)?.properties?.sheetId;
        if (sheetId === undefined) {
            // This case should be rare if rowIndex was found, but as a safeguard:
            return NextResponse.json({ message: `Sheet with name ${sheetName} found but could not retrieve its ID for deletion.` }, { status: 500 });
        }
    }


    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1,
                endIndex: rowIndex,
              },
            },
          },
        ],
      },
    });

    return NextResponse.json({ message: `Transaction ${transactionId} deleted successfully.` });
  } catch (error: any) {
    console.error(`[API DELETE /transactions/${transactionId}] Error:`, error.message, error.stack);
    const message = error.errors?.[0]?.message || error.message || 'Failed to delete transaction.';
    const statusCode = error.code || 500;
    return NextResponse.json({ message, details: error.stack }, { status: statusCode });
  }
}
