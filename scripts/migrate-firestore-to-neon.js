#!/usr/bin/env node
/**
 * Migration script: Firestore -> Neon PostgreSQL
 * Reads all collections from Firestore via REST API (rules allow public read)
 * then creates tables + inserts data into Neon PostgreSQL.
 */

const { Client } = require('pg');

const FIRESTORE_PROJECT_ID = 'databasethuchi';
const NEON_CONNECTION_STRING = 'postgresql://neondb_owner:npg_UZuEDWi6cy9G@ep-falling-salad-a1ds7wib-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const COLLECTIONS = [
  'transactions',
  'shared_notes',
  'calendar_events',
  'work_schedules',
  'sticky_notes',
];

// Fetch all documents from a Firestore collection via REST API
async function fetchFirestoreCollection(collection) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents/${collection}`;
  console.log(`\n📥 Fetching collection: ${collection}...`);

  const allDocs = [];
  let pageToken = null;

  do {
    const fetchUrl = pageToken ? `${url}?pageToken=${pageToken}` : url;
    const response = await fetch(fetchUrl);

    if (!response.ok) {
      const text = await response.text();
      console.warn(`  ⚠️  ${collection} returned ${response.status}: ${text.slice(0, 200)}`);
      return [];
    }

    const data = await response.json();

    if (data.documents) {
      allDocs.push(...data.documents);
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  console.log(`  ✅ Found ${allDocs.length} documents`);
  return allDocs;
}

// Convert Firestore value to JS value
function fromFirestoreValue(value) {
  if (value === null || value === undefined) return null;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return parseFloat(value.doubleValue);
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.nullValue !== undefined) return null;
  if (value.timestampValue !== undefined) return value.timestampValue;
  if (value.mapValue !== undefined) {
    const result = {};
    const fields = value.mapValue.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      result[k] = fromFirestoreValue(v);
    }
    return result;
  }
  if (value.arrayValue !== undefined) {
    const values = value.arrayValue.values || [];
    return values.map(fromFirestoreValue);
  }
  return null;
}

// Parse a Firestore document into a plain JS object
function parseFirestoreDoc(doc) {
  const id = doc.name.split('/').pop();
  const result = { id };
  const fields = doc.fields || {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = fromFirestoreValue(value);
  }
  return result;
}

// Create all tables in Neon
async function createTables(client) {
  console.log('\n🏗️  Creating tables in Neon...');

  await client.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      "familyId" TEXT,
      "performedBy" TEXT,
      description TEXT,
      amount REAL,
      date TEXT,
      type TEXT,
      "categoryId" TEXT,
      "monthYear" TEXT,
      note TEXT,
      "paymentSource" TEXT,
      "createdAt" TEXT
    );
  `);
  console.log('  ✅ transactions');

  await client.query(`
    CREATE TABLE IF NOT EXISTS shared_notes (
      id TEXT PRIMARY KEY,
      "familyId" TEXT,
      content TEXT,
      "modifiedBy" TEXT,
      "modifiedAt" TEXT
    );
  `);
  console.log('  ✅ shared_notes');

  await client.query(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      "familyId" TEXT,
      title TEXT,
      description TEXT,
      type TEXT,
      date TEXT,
      "isRecurring" BOOLEAN,
      "recurringPattern" TEXT,
      "isLunarDate" BOOLEAN,
      "lunarDate" JSONB,
      "createdBy" TEXT,
      color TEXT,
      priority TEXT,
      "createdAt" TEXT,
      "updatedAt" TEXT
    );
  `);
  console.log('  ✅ calendar_events');

  await client.query(`
    CREATE TABLE IF NOT EXISTS work_schedules (
      id TEXT PRIMARY KEY,
      "familyId" TEXT,
      "employeeName" TEXT,
      title TEXT,
      "startTime" TEXT,
      "endTime" TEXT,
      date TEXT,
      "isRecurring" BOOLEAN,
      location TEXT,
      notes TEXT,
      color TEXT,
      "createdAt" TEXT,
      "updatedAt" TEXT
    );
  `);
  console.log('  ✅ work_schedules');

  await client.query(`
    CREATE TABLE IF NOT EXISTS sticky_notes (
      id TEXT PRIMARY KEY,
      "familyId" TEXT,
      title TEXT,
      content TEXT,
      color TEXT,
      position JSONB,
      size JSONB,
      "isMinimized" BOOLEAN DEFAULT false,
      "isPinned" BOOLEAN DEFAULT false,
      "createdAt" TEXT,
      "updatedAt" TEXT,
      "createdBy" TEXT,
      "lastModifiedBy" TEXT
    );
  `);
  console.log('  ✅ sticky_notes');
}

// Insert transactions
async function insertTransactions(client, docs) {
  if (docs.length === 0) return;
  console.log(`  📝 Inserting ${docs.length} transactions...`);
  let inserted = 0;
  for (const doc of docs) {
    try {
      await client.query(
        `INSERT INTO transactions (id, "familyId", "performedBy", description, amount, date, type, "categoryId", "monthYear", note, "paymentSource", "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (id) DO UPDATE SET
           "familyId"=EXCLUDED."familyId", "performedBy"=EXCLUDED."performedBy",
           description=EXCLUDED.description, amount=EXCLUDED.amount, date=EXCLUDED.date,
           type=EXCLUDED.type, "categoryId"=EXCLUDED."categoryId", "monthYear"=EXCLUDED."monthYear",
           note=EXCLUDED.note, "paymentSource"=EXCLUDED."paymentSource", "createdAt"=EXCLUDED."createdAt"`,
        [doc.id, doc.familyId, doc.performedBy, doc.description, doc.amount,
         doc.date, doc.type, doc.categoryId, doc.monthYear, doc.note,
         doc.paymentSource, doc.createdAt]
      );
      inserted++;
    } catch (err) {
      console.warn(`  ⚠️  Skip transaction ${doc.id}: ${err.message}`);
    }
  }
  console.log(`  ✅ ${inserted}/${docs.length} inserted`);
}

// Insert shared_notes
async function insertSharedNotes(client, docs) {
  if (docs.length === 0) return;
  console.log(`  📝 Inserting ${docs.length} shared_notes...`);
  let inserted = 0;
  for (const doc of docs) {
    try {
      await client.query(
        `INSERT INTO shared_notes (id, "familyId", content, "modifiedBy", "modifiedAt")
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO UPDATE SET
           "familyId"=EXCLUDED."familyId", content=EXCLUDED.content,
           "modifiedBy"=EXCLUDED."modifiedBy", "modifiedAt"=EXCLUDED."modifiedAt"`,
        [doc.id, doc.familyId, doc.content, doc.modifiedBy, doc.modifiedAt]
      );
      inserted++;
    } catch (err) {
      console.warn(`  ⚠️  Skip shared_note ${doc.id}: ${err.message}`);
    }
  }
  console.log(`  ✅ ${inserted}/${docs.length} inserted`);
}

// Insert calendar_events
async function insertCalendarEvents(client, docs) {
  if (docs.length === 0) return;
  console.log(`  📝 Inserting ${docs.length} calendar_events...`);
  let inserted = 0;
  for (const doc of docs) {
    try {
      await client.query(
        `INSERT INTO calendar_events (id, "familyId", title, description, type, date, "isRecurring", "recurringPattern", "isLunarDate", "lunarDate", "createdBy", color, priority, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (id) DO UPDATE SET
           "familyId"=EXCLUDED."familyId", title=EXCLUDED.title, description=EXCLUDED.description,
           type=EXCLUDED.type, date=EXCLUDED.date, "isRecurring"=EXCLUDED."isRecurring",
           "recurringPattern"=EXCLUDED."recurringPattern", "isLunarDate"=EXCLUDED."isLunarDate",
           "lunarDate"=EXCLUDED."lunarDate", "createdBy"=EXCLUDED."createdBy", color=EXCLUDED.color,
           priority=EXCLUDED.priority, "createdAt"=EXCLUDED."createdAt", "updatedAt"=EXCLUDED."updatedAt"`,
        [doc.id, doc.familyId, doc.title, doc.description, doc.type, doc.date,
         doc.isRecurring, doc.recurringPattern, doc.isLunarDate,
         doc.lunarDate ? JSON.stringify(doc.lunarDate) : null,
         doc.createdBy, doc.color, doc.priority, doc.createdAt, doc.updatedAt]
      );
      inserted++;
    } catch (err) {
      console.warn(`  ⚠️  Skip calendar_event ${doc.id}: ${err.message}`);
    }
  }
  console.log(`  ✅ ${inserted}/${docs.length} inserted`);
}

// Insert work_schedules
async function insertWorkSchedules(client, docs) {
  if (docs.length === 0) return;
  console.log(`  📝 Inserting ${docs.length} work_schedules...`);
  let inserted = 0;
  for (const doc of docs) {
    try {
      await client.query(
        `INSERT INTO work_schedules (id, "familyId", "employeeName", title, "startTime", "endTime", date, "isRecurring", location, notes, color, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (id) DO UPDATE SET
           "familyId"=EXCLUDED."familyId", "employeeName"=EXCLUDED."employeeName", title=EXCLUDED.title,
           "startTime"=EXCLUDED."startTime", "endTime"=EXCLUDED."endTime", date=EXCLUDED.date,
           "isRecurring"=EXCLUDED."isRecurring", location=EXCLUDED.location, notes=EXCLUDED.notes,
           color=EXCLUDED.color, "createdAt"=EXCLUDED."createdAt", "updatedAt"=EXCLUDED."updatedAt"`,
        [doc.id, doc.familyId, doc.employeeName, doc.title, doc.startTime,
         doc.endTime, doc.date, doc.isRecurring, doc.location, doc.notes,
         doc.color, doc.createdAt, doc.updatedAt]
      );
      inserted++;
    } catch (err) {
      console.warn(`  ⚠️  Skip work_schedule ${doc.id}: ${err.message}`);
    }
  }
  console.log(`  ✅ ${inserted}/${docs.length} inserted`);
}

// Insert sticky_notes
async function insertStickyNotes(client, docs) {
  if (docs.length === 0) return;
  console.log(`  📝 Inserting ${docs.length} sticky_notes...`);
  let inserted = 0;
  for (const doc of docs) {
    try {
      await client.query(
        `INSERT INTO sticky_notes (id, "familyId", title, content, color, position, size, "isMinimized", "isPinned", "createdAt", "updatedAt", "createdBy", "lastModifiedBy")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (id) DO UPDATE SET
           "familyId"=EXCLUDED."familyId", title=EXCLUDED.title, content=EXCLUDED.content,
           color=EXCLUDED.color, position=EXCLUDED.position, size=EXCLUDED.size,
           "isMinimized"=EXCLUDED."isMinimized", "isPinned"=EXCLUDED."isPinned",
           "createdAt"=EXCLUDED."createdAt", "updatedAt"=EXCLUDED."updatedAt",
           "createdBy"=EXCLUDED."createdBy", "lastModifiedBy"=EXCLUDED."lastModifiedBy"`,
        [doc.id, doc.familyId, doc.title, doc.content, doc.color,
         doc.position ? JSON.stringify(doc.position) : null,
         doc.size ? JSON.stringify(doc.size) : null,
         doc.isMinimized ?? false, doc.isPinned ?? false,
         doc.createdAt, doc.updatedAt, doc.createdBy, doc.lastModifiedBy]
      );
      inserted++;
    } catch (err) {
      console.warn(`  ⚠️  Skip sticky_note ${doc.id}: ${err.message}`);
    }
  }
  console.log(`  ✅ ${inserted}/${docs.length} inserted`);
}

async function main() {
  console.log('🚀 Starting Firestore -> Neon migration');
  console.log(`📂 Firestore project: ${FIRESTORE_PROJECT_ID}`);
  console.log(`🐘 Neon database: ep-falling-salad-a1ds7wib-pooler.ap-southeast-1.aws.neon.tech\n`);

  // Step 1: Fetch all Firestore data
  const firestoreData = {};
  for (const collection of COLLECTIONS) {
    const rawDocs = await fetchFirestoreCollection(collection);
    firestoreData[collection] = rawDocs.map(parseFirestoreDoc);
  }

  // Step 2: Connect to Neon
  console.log('\n🔌 Connecting to Neon PostgreSQL...');
  const client = new Client({ connectionString: NEON_CONNECTION_STRING });
  await client.connect();
  console.log('  ✅ Connected');

  try {
    // Step 3: Create tables
    await createTables(client);

    // Step 4: Insert data
    console.log('\n📤 Importing data into Neon...');
    await insertTransactions(client, firestoreData['transactions']);
    await insertSharedNotes(client, firestoreData['shared_notes']);
    await insertCalendarEvents(client, firestoreData['calendar_events']);
    await insertWorkSchedules(client, firestoreData['work_schedules']);
    await insertStickyNotes(client, firestoreData['sticky_notes']);

    // Step 5: Summary
    console.log('\n📊 Migration summary:');
    for (const collection of COLLECTIONS) {
      const result = await client.query(`SELECT COUNT(*) FROM ${collection}`);
      const tableName = collection;
      console.log(`  ${tableName}: ${result.rows[0].count} rows`);
    }

    console.log('\n🎉 Migration completed successfully!');
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
