
import { type NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import type { FamilyMember } from '@/types';
import { SHARED_NOTES_SHEET_NAME, SHARED_NOTE_CELL, SHARED_NOTE_MODIFIED_INFO_CELL } from '@/lib/constants';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// Initialize Google Auth directly. Service account key path from environment variable.
const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  // credentials will be auto-loaded from GOOGLE_APPLICATION_CREDENTIALS if set
});

const sheets = google.sheets({ version: 'v4', auth });

interface NoteModifiedInfo {
  modifiedBy: FamilyMember;
  modifiedAt: string; // ISO Date string
}

async function ensureSheetExists(spreadsheetId: string, sheetName: string) {
  console.log(`[API /shared-notes] ensureSheetExists called for sheet: ${sheetName}`);
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = spreadsheet.data.sheets?.some(s => s.properties?.title === sheetName);

    if (!sheetExists) {
      console.log(`[API /shared-notes] Sheet "${sheetName}" does not exist. Creating it.`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: sheetName } } }],
        },
      });
      console.log(`[API /shared-notes] Sheet "${sheetName}" created.`);
    } else {
      console.log(`[API /shared-notes] Sheet "${sheetName}" already exists.`);
    }
  } catch (error: any) {
    console.error(`[API /shared-notes] Error in ensureSheetExists for sheet "${sheetName}":`, error.message, error.stack, error.errors);
    const message = error.errors?.[0]?.message || error.message || `Failed to ensure sheet "${sheetName}" exists.`;
    // Re-throw with a specific code if available, or just the message
    const errToThrow = new Error(message) as any;
    errToThrow.code = error.code || 500; // Google API errors often have a 'code' property
    errToThrow.details = error.stack;
    errToThrow.originalErrors = error.errors;
    throw errToThrow;
  }
}

export async function GET(request: NextRequest) {
  console.log(`[API /shared-notes] GET request received from URL: ${request.url}`);
  if (!SPREADSHEET_ID) {
    console.error("[API /shared-notes GET] Google Sheet ID not configured.");
    return NextResponse.json({ message: 'Google Sheet ID not configured on the server.' }, { status: 500 });
  }
  
  try {
    await ensureSheetExists(SPREADSHEET_ID, SHARED_NOTES_SHEET_NAME);

    const rangeToRead = `${SHARED_NOTES_SHEET_NAME}!${SHARED_NOTE_CELL}:${SHARED_NOTE_MODIFIED_INFO_CELL}`;
    console.log(`[API /shared-notes] Reading from range: ${rangeToRead}`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: rangeToRead,
    });

    const values = response.data.values;
    let note = "";
    let modifiedInfo: NoteModifiedInfo | null = null;

    if (values && values.length > 0 && values[0]) {
      note = values[0][0] || ""; 
      if (values[0][1]) { 
        try {
          modifiedInfo = JSON.parse(values[0][1]);
        } catch (e) {
          console.warn(`[API /shared-notes] Could not parse modifiedInfo JSON: ${values[0][1]}`, e);
          // It's not critical if this parse fails, proceed with empty/default modifiedInfo
        }
      }
    }
    console.log(`[API /shared-notes] Fetched note: "${note ? note.substring(0,50)+'...' : 'empty'}", modifiedInfo:`, modifiedInfo);
    return NextResponse.json({ note, modifiedBy: modifiedInfo?.modifiedBy, modifiedAt: modifiedInfo?.modifiedAt });

  } catch (error: any) {
    console.error('[API /shared-notes GET] Error processing GET request:', error.message, error.stack, error.originalErrors);
    let message = 'Failed to fetch shared note.';
    if (error.message) {
        message = error.message.includes("No sheet with the name") || error.message.includes("Unable to parse range")
            ? `Sheet "${SHARED_NOTES_SHEET_NAME}" not found or range invalid. It will be created on next save.`
            : error.message;
    }
    
    let statusCode = typeof error.code === 'number' && error.code >= 200 && error.code <= 599 ? error.code : 500;

    // Special case for "sheet not found" during GET - return 200 with empty data
    // This allows the UI to load gracefully on first run when the sheet might not exist yet.
    if (message.includes(`Sheet "${SHARED_NOTES_SHEET_NAME}" not found`)) {
        console.warn(`[API /shared-notes GET] Sheet "${SHARED_NOTES_SHEET_NAME}" not found, returning empty note for client.`);
        return NextResponse.json({ note: "", modifiedBy: undefined, modifiedAt: undefined });
    }
    
    return NextResponse.json({ message, details: error.stack, originalErrors: error.originalErrors }, { status: statusCode });
  }
}

export async function POST(request: NextRequest) {
  console.log(`[API /shared-notes] POST request received from URL: ${request.url}`);
  if (!SPREADSHEET_ID) {
     console.error("[API /shared-notes POST] Google Sheet ID not configured.");
    return NextResponse.json({ message: 'Google Sheet ID not configured on the server.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { note, modifiedBy } = body;

    if (typeof note !== 'string' || !modifiedBy) {
      return NextResponse.json({ message: 'Invalid request body. "note" (string) and "modifiedBy" are required.' }, { status: 400 });
    }

    await ensureSheetExists(SPREADSHEET_ID, SHARED_NOTES_SHEET_NAME);

    const modifiedAt = new Date().toISOString();
    const modifiedInfo: NoteModifiedInfo = { modifiedBy, modifiedAt };

    const valuesToWrite = [
      [note, JSON.stringify(modifiedInfo)] 
    ];

    const rangeToWrite = `${SHARED_NOTES_SHEET_NAME}!${SHARED_NOTE_CELL}:${SHARED_NOTE_MODIFIED_INFO_CELL}`;
    console.log(`[API /shared-notes] Writing to range: ${rangeToWrite}, Data:`, valuesToWrite);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: rangeToWrite,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: valuesToWrite,
      },
    });
    console.log('[API /shared-notes] Shared note updated successfully.');
    return NextResponse.json({ success: true, note, modifiedBy, modifiedAt });

  } catch (error: any) {
    console.error('[API /shared-notes POST] Error processing POST request:', error.message, error.stack, error.originalErrors);
    const message = error.errors?.[0]?.message || error.message || 'Failed to save shared note.';
    let statusCode = typeof error.code === 'number' && error.code >= 200 && error.code <= 599 ? error.code : 500;
    return NextResponse.json({ message, details: error.stack, originalErrors: error.originalErrors }, { status: statusCode });
  }
}
