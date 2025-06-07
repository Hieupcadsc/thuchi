
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/sqlite'; // Using SQLite
import type { FamilyMember } from '@/types';

interface NoteModifiedInfo {
  modifiedBy: FamilyMember;
  modifiedAt: string; // ISO Date string
}

// Ensure DB is initialized - this will run when the module is loaded
// initDb(); // initDb is now called when sqlite.ts is imported

export async function GET(request: NextRequest) {
  console.log(`[API_SQLite /shared-notes] GET request received from URL: ${request.url}`);
  try {
    const stmt = db.prepare("SELECT note_content, modifiedBy, modifiedAt FROM shared_notes WHERE id = 1");
    const result = stmt.get() as { note_content: string; modifiedBy?: FamilyMember; modifiedAt?: string } | undefined;

    if (result) {
      console.log(`[API_SQLite /shared-notes] Fetched note, modifiedBy: ${result.modifiedBy}, modifiedAt: ${result.modifiedAt}`);
      return NextResponse.json({
        note: result.note_content || "", // Ensure note is always a string
        modifiedBy: result.modifiedBy,
        modifiedAt: result.modifiedAt,
      });
    } else {
      // This case should ideally not happen if initDb ensures the row exists
      console.warn(`[API_SQLite /shared-notes] No note found with id = 1. Returning empty note.`);
      return NextResponse.json({ note: "", modifiedBy: undefined, modifiedAt: undefined });
    }
  } catch (error: any) {
    console.error('[API_SQLite /shared-notes GET] Error processing GET request:', error.message, error.stack);
    const message = error.message || 'Failed to fetch shared note from SQLite.';
    // Determine a safe status code, default to 500 if not a number or out of range
    let statusCode = typeof error.code === 'number' && error.code >= 200 && error.code <= 599 ? error.code : 500;
    return NextResponse.json({ message, details: error.stack }, { status: statusCode });
  }
}

export async function POST(request: NextRequest) {
  console.log(`[API_SQLite /shared-notes] POST request received from URL: ${request.url}`);
  try {
    const body = await request.json();
    const { note, modifiedBy } = body;

    if (typeof note !== 'string' || !modifiedBy) {
      return NextResponse.json({ message: 'Invalid request body. "note" (string) and "modifiedBy" are required.' }, { status: 400 });
    }

    const modifiedAt = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE shared_notes 
      SET note_content = ?, modifiedBy = ?, modifiedAt = ? 
      WHERE id = 1
    `);
    const info = stmt.run(note, modifiedBy, modifiedAt);

    if (info.changes > 0) {
      console.log('[API_SQLite /shared-notes] Shared note updated successfully.');
      return NextResponse.json({ success: true, note, modifiedBy, modifiedAt });
    } else {
      // This might happen if the row with id=1 was somehow deleted after init
      console.error('[API_SQLite /shared-notes POST] Failed to update note, row with id=1 might be missing. Attempting to re-insert.');
      // Attempt to re-insert (or ensure it exists via initDb again, though less direct)
      // For simplicity, let's assume initDb should handle this. If still failing, it's a deeper issue.
      // Or, try an INSERT OR REPLACE logic if the schema was different.
      // With current schema (id=1 default), an UPDATE should generally work if row exists.
      // Try to re-initialize just in case of a very rare scenario where the row is gone.
      // This is a bit of a heavy-handed recovery, ideally the row should always be there.
      // initDb(); // Re-run init - commented out as it's now in sqlite.ts import
      // Retry the update one more time
      const retryInfo = stmt.run(note, modifiedBy, modifiedAt);
      if (retryInfo.changes > 0) {
          console.log('[API_SQLite /shared-notes] Shared note updated successfully after retry.');
          return NextResponse.json({ success: true, note, modifiedBy, modifiedAt });
      }
      console.error('[API_SQLite /shared-notes POST] Failed to update note even after retry.');
      return NextResponse.json({ message: 'Failed to save shared note. Row not found or not updated.', success: false }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[API_SQLite /shared-notes POST] Error processing POST request:', error.message, error.stack);
    const message = error.message || 'Failed to save shared note to SQLite.';
    let statusCode = typeof error.code === 'number' && error.code >= 200 && error.code <= 599 ? error.code : 500;
    return NextResponse.json({ message, details: error.stack }, { status: statusCode });
  }
}
