/**
 * GET /api/migrate-from-firestore
 *
 * Reads all Firestore collections and imports them into Neon PostgreSQL.
 * Run this ONCE after deployment to transfer existing Firestore data.
 * Uses the Firestore REST API (rules allow public read).
 */
import { NextResponse } from 'next/server';
import { getPool, initNeonDb } from '@/lib/neon';

const FIRESTORE_PROJECT_ID = 'databasethuchi';

// ── Firestore REST helpers ────────────────────────────────────────────────────

function fromFirestoreValue(value: any): any {
  if (!value) return null;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return parseFloat(value.doubleValue);
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.nullValue !== undefined) return null;
  if (value.timestampValue !== undefined) return value.timestampValue;
  if (value.mapValue !== undefined) {
    const result: any = {};
    for (const [k, v] of Object.entries(value.mapValue.fields || {})) {
      result[k] = fromFirestoreValue(v);
    }
    return result;
  }
  if (value.arrayValue !== undefined) {
    return (value.arrayValue.values || []).map(fromFirestoreValue);
  }
  return null;
}

function parseDoc(doc: any) {
  const id = doc.name.split('/').pop();
  const result: any = { id };
  for (const [key, value] of Object.entries(doc.fields || {})) {
    result[key] = fromFirestoreValue(value);
  }
  return result;
}

async function fetchCollection(collection: string) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents/${collection}`;
  const docs: any[] = [];
  let pageToken: string | null = null;
  do {
    const fetchUrl = pageToken ? `${url}?pageToken=${pageToken}` : url;
    const res = await fetch(fetchUrl);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.documents) docs.push(...data.documents.map(parseDoc));
    pageToken = data.nextPageToken ?? null;
  } while (pageToken);
  return docs;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET() {
  const pool = getPool();
  const summary: Record<string, number> = {};

  try {
    // Ensure tables exist
    await initNeonDb();

    const collections = ['transactions', 'shared_notes', 'calendar_events', 'work_schedules', 'sticky_notes'];

    for (const col of collections) {
      const docs = await fetchCollection(col);
      let count = 0;

      for (const doc of docs) {
        try {
          if (col === 'transactions') {
            await pool.query(
              `INSERT INTO transactions (id,"familyId","performedBy",description,amount,date,type,"categoryId","monthYear",note,"paymentSource","createdAt")
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
              [doc.id, doc.familyId, doc.performedBy, doc.description, doc.amount,
               doc.date, doc.type, doc.categoryId, doc.monthYear, doc.note ?? null,
               doc.paymentSource ?? null, doc.createdAt ?? null]
            );
          } else if (col === 'shared_notes') {
            await pool.query(
              `INSERT INTO shared_notes (id,"familyId",content,"modifiedBy","modifiedAt")
               VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
              [doc.id, doc.familyId, doc.content ?? '', doc.modifiedBy ?? null, doc.modifiedAt ?? null]
            );
          } else if (col === 'calendar_events') {
            await pool.query(
              `INSERT INTO calendar_events (id,"familyId",title,description,type,date,"isRecurring","recurringPattern","isLunarDate","lunarDate","createdBy",color,priority,"createdAt","updatedAt")
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT (id) DO NOTHING`,
              [doc.id, doc.familyId, doc.title, doc.description ?? null, doc.type ?? 'family',
               doc.date, doc.isRecurring ?? false, doc.recurringPattern ?? null,
               doc.isLunarDate ?? false,
               doc.lunarDate ? JSON.stringify(doc.lunarDate) : null,
               doc.createdBy, doc.color ?? '#8B5CF6', doc.priority ?? 'medium',
               doc.createdAt ?? null, doc.updatedAt ?? null]
            );
          } else if (col === 'work_schedules') {
            await pool.query(
              `INSERT INTO work_schedules (id,"familyId","employeeName",title,"startTime","endTime",date,"isRecurring",location,notes,color,"createdAt","updatedAt")
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (id) DO NOTHING`,
              [doc.id, doc.familyId ?? null, doc.employeeName, doc.title,
               doc.startTime, doc.endTime, doc.date,
               doc.isRecurring ?? false, doc.location ?? null, doc.notes ?? null,
               doc.color ?? '#4A90E2', doc.createdAt ?? null, doc.updatedAt ?? null]
            );
          } else if (col === 'sticky_notes') {
            await pool.query(
              `INSERT INTO sticky_notes (id,"familyId",title,content,color,position,size,"isMinimized","isPinned","createdAt","updatedAt","createdBy","lastModifiedBy")
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (id) DO NOTHING`,
              [doc.id, doc.familyId, doc.title, doc.content ?? '', doc.color ?? 'yellow',
               doc.position ? JSON.stringify(doc.position) : null,
               doc.size ? JSON.stringify(doc.size) : null,
               doc.isMinimized ?? false, doc.isPinned ?? false,
               doc.createdAt, doc.updatedAt, doc.createdBy, doc.lastModifiedBy]
            );
          }
          count++;
        } catch { /* skip duplicates */ }
      }
      summary[col] = count;
    }

    return NextResponse.json({
      success: true,
      message: 'Migration from Firestore to Neon completed',
      imported: summary
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
