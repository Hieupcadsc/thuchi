
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
    throw new Error(`Failed to ensure sheet "${sheetName}" exists: ${error.message}`);
  }
}

export async function GET(request: NextRequest) {
  if (!SPREADSHEET_ID) {
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
      note = values[0][0] || ""; // Note content from A1
      if (values[0][1]) { // Modified info from B1
        try {
          modifiedInfo = JSON.parse(values[0][1]);
        } catch (e) {
          console.warn(`[API /shared-notes] Could not parse modifiedInfo JSON: ${values[0][1]}`, e);
          // If B1 is not valid JSON, we ignore it but still return the note.
          // We could also try to save a default value here or clear B1.
        }
      }
    }
    console.log(`[API /shared-notes] Fetched note: "${note ? note.substring(0,50)+'...' : ''}", modifiedInfo:`, modifiedInfo);
    return NextResponse.json({ note, modifiedBy: modifiedInfo?.modifiedBy, modifiedAt: modifiedInfo?.modifiedAt });

  } catch (error: any) {
    console.error('[API /shared-notes GET] Error:', error.message, error.stack);
    const message = error.message?.includes("No sheet with the name") || error.message?.includes("Unable to parse range")
      ? `Sheet "${SHARED_NOTES_SHEET_NAME}" not found or range invalid. It will be created on next save.`
      : error.message || 'Failed to fetch shared note.';
    if (error.message?.includes("No sheet with the name") || error.message?.includes("Unable to parse range")){
         return NextResponse.json({ note: "", modifiedBy: undefined, modifiedAt: undefined }); // Return empty if sheet not found by GET
    }
    return NextResponse.json({ message, details: error.stack }, { status: error.code || 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!SPREADSHEET_ID) {
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
      [note, JSON.stringify(modifiedInfo)] // Note in A1, JSON info in B1
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
    return NextResponse.json({ message: error.message || 'Failed to save shared note.', details: error.stack }, { status: error.code || 500 });
  }
}
