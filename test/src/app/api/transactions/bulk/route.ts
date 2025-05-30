
import { type NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import type { sheets_v4 } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

interface TransactionToDelete {
  id: string;
  monthYear: string;
}

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
    throw error; // Re-throw other errors
  }
}

export async function POST(request: NextRequest) {
  if (!SPREADSHEET_ID) {
    return NextResponse.json({ message: 'Google Sheet ID not configured on the server.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const transactionsToDelete: TransactionToDelete[] = body.transactions;

    if (!Array.isArray(transactionsToDelete) || transactionsToDelete.length === 0) {
      return NextResponse.json({ message: 'No transactions provided for deletion or invalid format.' }, { status: 400 });
    }

    const deleteRequestsBySheetId: Record<number, sheets_v4.Schema$Request[]> = {};
    let successfullyProcessedCount = 0;
    const errors: string[] = [];

    // Fetch all sheet properties once to map names to sheetIds
    const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetProperties = spreadsheetInfo.data.sheets?.map(s => s.properties).filter(Boolean) as sheets_v4.Schema$SheetProperties[];


    for (const transaction of transactionsToDelete) {
      const sheetName = transaction.monthYear;
      const currentSheetProps = sheetProperties.find(sp => sp.title === sheetName);

      if (!currentSheetProps || currentSheetProps.sheetId === null || currentSheetProps.sheetId === undefined) {
        errors.push(`Sheet with name ${sheetName} for transaction ID ${transaction.id} not found or has no sheetId.`);
        continue;
      }
      const sheetId = currentSheetProps.sheetId;

      const rowIndex = await findRowById(SPREADSHEET_ID, sheetName, transaction.id);
      if (!rowIndex) {
        errors.push(`Transaction with ID ${transaction.id} not found in sheet ${sheetName}.`);
        continue;
      }

      if (!deleteRequestsBySheetId[sheetId]) {
        deleteRequestsBySheetId[sheetId] = [];
      }

      deleteRequestsBySheetId[sheetId].push({
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1, // 0-indexed
            endIndex: rowIndex,
          },
        },
      });
      successfullyProcessedCount++;
    }
    
    // Execute batch updates for each sheetId group
    // Important: Requests for batchUpdate need to be sorted in descending order of startIndex to avoid shifting issues
    for (const sheetIdKey in deleteRequestsBySheetId) {
        const sheetIdNum = parseInt(sheetIdKey, 10);
        const requestsForSheet = deleteRequestsBySheetId[sheetIdNum].sort((a, b) => {
            const startIndexA = a.deleteDimension?.range?.startIndex ?? 0;
            const startIndexB = b.deleteDimension?.range?.startIndex ?? 0;
            return startIndexB - startIndexA; // Sort descending
        });
        
        if (requestsForSheet.length > 0) {
             try {
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId: SPREADSHEET_ID,
                    requestBody: { requests: requestsForSheet },
                });
            } catch (batchError: any) {
                console.error(`[API POST /transactions/bulk] Error during batchUpdate for sheetId ${sheetIdNum}:`, batchError.message, batchError.stack);
                errors.push(`Failed to delete some items from sheetId ${sheetIdNum}: ${batchError.message}`);
                // Note: It's hard to know exactly which items failed in a batch without more complex response parsing.
                // For simplicity, we mark the whole batch for this sheet as potentially problematic.
                // A more robust solution might try to retry individual failures or provide more granular error feedback.
                // For now, we'll assume some deletions on this sheet might have failed and reduce successfullyProcessedCount accordingly for this sheet.
                // This is a simplification. A real app would need more detailed error handling from batchUpdate responses.
                successfullyProcessedCount -= requestsForSheet.length; // Approximation
            }
        }
    }


    if (errors.length > 0) {
      return NextResponse.json({ 
        message: `Processed ${successfullyProcessedCount} deletions. Some errors occurred.`, 
        deletedCount: successfullyProcessedCount,
        errors 
      }, { status: successfullyProcessedCount > 0 ? 207 : 500 }); // 207 Multi-Status
    }

    return NextResponse.json({ message: `Successfully deleted ${successfullyProcessedCount} transactions.`, deletedCount: successfullyProcessedCount });

  } catch (error: any) {
    console.error('[API POST /transactions/bulk] Error:', error.message, error.stack);
    return NextResponse.json({ message: error.message || 'Failed to bulk delete transactions.', details: error.stack }, { status: 500 });
  }
}
