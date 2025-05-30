
import { type NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import type { FamilyMember } from '@/types';
import { SHARED_NOTES_SHEET_NAME, SHARED_NOTE_CELL, SHARED_NOTE_MODIFIED_INFO_CELL } from '@/lib/constants';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
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
    console.error(`[API /shared-notes] Error in ensureSheetExists for sheet "${sheetName}":`, error.message, error.stack);
    const message = error.errors?.[0]?.message || error.message || `Failed to ensure sheet "${sheetName}" exists.`;
    throw Object.assign(new Error(message), { code: error.code, details: error.stack });
  }
}

export async function GET(request: NextRequest) {
  if (!SPREADSHEET_ID) {
    console.error("[API /shared-notes GET] Google Sheet ID not configured.");
    return NextResponse.json({ message: 'Google Sheet ID not configured.' }, { status: 500 });
  }
  console.log('[API /shared-notes] GET request received');

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

    if (values && values[0]) {
      note = values[0][0] || ""; 
      if (values[0][1]) { 
        try {
          modifiedInfo = JSON.parse(values[0][1]);
        } catch (e) {
          console.warn(`[API /shared-notes] Could not parse modifiedInfo JSON: ${values[0][1]}`, e);
        }
      }
    }
    console.log(`[API /shared-notes] Fetched note: "${note ? note.substring(0,50)+'...' : ''}", modifiedInfo:`, modifiedInfo);
    return NextResponse.json({ note, modifiedBy: modifiedInfo?.modifiedBy, modifiedAt: modifiedInfo?.modifiedAt });

  } catch (error: any) {
    console.error('[API /shared-notes GET] Error:', error.message, error.stack);
    // Check if it's a "sheet not found" type of error specifically from ensureSheetExists or a general Google API error
    const message = error.errors?.[0]?.message || error.message || 'Failed to fetch shared note.';
    const statusCode = error.code || 500;

    if (message.includes(`Failed to ensure sheet "${SHARED_NOTES_SHEET_NAME}" exists`) || message.includes("No sheet with the name") || message.includes("Unable to parse range")) {
         // If ensureSheetExists failed (e.g. sheet doesn't exist and couldn't be created due to permissions)
         // or if the range is invalid because sheet doesn't exist at all after a failed creation.
         // Still return a 200 with empty data for the client to handle gracefully on first load.
         return NextResponse.json({ note: "", modifiedBy: undefined, modifiedAt: undefined });
    }
    return NextResponse.json({ message, details: error.stack }, { status: statusCode });
  }
}

export async function POST(request: NextRequest) {
  if (!SPREADSHEET_ID) {
     console.error("[API /shared-notes POST] Google Sheet ID not configured.");
    return NextResponse.json({ message: 'Google Sheet ID not configured.' }, { status: 500 });
  }
  console.log('[API /shared-notes] POST request received');

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
    console.error('[API /shared-notes POST] Error:', error.message, error.stack);
    const message = error.errors?.[0]?.message || error.message || 'Failed to save shared note.';
    const statusCode = error.code || 500;
    return NextResponse.json({ message, details: error.stack }, { status: statusCode });
  }
}
