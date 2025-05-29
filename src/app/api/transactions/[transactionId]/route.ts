
import { type NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import type { Transaction, PaymentSource } from '@/types';
import { PAYMENT_SOURCE_OPTIONS } from '@/lib/constants'; // Import if needed for validation, though type system helps

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

// Ensure PaymentSource is the last column
const HEADER_ROW = ['ID', 'UserID', 'Description', 'Amount', 'Date', 'Type', 'CategoryID', 'MonthYear', 'Note', 'PerformedBy', 'PaymentSource'];


async function findRowById(spreadsheetId: string, sheetName: string, transactionId: string): Promise<number | null> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`, // Assuming ID is in column A
    });
    const rows = response.data.values;
    if (rows) {
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][0] === transactionId) {
          return i + 1; // Return 1-based row index
        }
      }
    }
    return null;
  } catch (error: any) {
    console.error(`Error finding row by ID ${transactionId} in sheet ${sheetName}:`, error.message);
    if (error.message && (error.message.includes("No sheet with the name") || error.message.includes("Unable to parse range"))) {
        return null;
    }
    throw error;
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
    if (!updatedTransactionData.paymentSource) { // Added paymentSource check
        return NextResponse.json({ message: 'paymentSource is required in transaction data for update.' }, { status: 400 });
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
      updatedTransactionData.paymentSource || '', // Add paymentSource
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
    return NextResponse.json({ message: error.message || 'Failed to update transaction.', details: error.stack }, { status: error.code || 500 });
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
    const sheetData = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID, ranges: [sheetName] });
    const sheetId = sheetData.data.sheets?.find(s => s.properties?.title === sheetName)?.properties?.sheetId;

    if (sheetId === undefined) { // Check for undefined explicitly
        return NextResponse.json({ message: `Sheet with name ${sheetName} not found.` }, { status: 404 });
    }

    const rowIndex = await findRowById(SPREADSHEET_ID, sheetName, transactionId);

    if (!rowIndex) {
      return NextResponse.json({ message: `Transaction with ID ${transactionId} not found in sheet ${sheetName}.` }, { status: 404 });
    }

    // Delete the row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1, // 0-indexed
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
    return NextResponse.json({ message: error.message || 'Failed to delete transaction.', details: error.stack }, { status: error.code || 500 });
  }
}
