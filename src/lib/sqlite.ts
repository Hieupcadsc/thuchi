
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_FILE_NAME = 'familybudget.sqlite';
// Determine the database path. In Vercel/serverless, use /tmp, otherwise use local project dir.
const DB_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, DB_FILE_NAME);


if (!process.env.VERCEL && !fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log(`SQLite data directory created at ${DB_DIR}`);
}

console.log(`[SQLite] Using database at: ${DB_PATH}`);

let dbInstance: Database.Database;

function getDbConnection() {
  if (!dbInstance) {
    try {
      dbInstance = new Database(DB_PATH, { verbose: console.log }); // Enable verbose logging for debugging
      console.log('[SQLite] New database connection established.');
      // Apply PRAGMA settings for better performance and WAL mode
      dbInstance.pragma('journal_mode = WAL');
      dbInstance.pragma('synchronous = NORMAL'); // Faster than FULL, still safe with WAL
      dbInstance.pragma('foreign_keys = ON'); // Enforce foreign key constraints
      dbInstance.pragma('busy_timeout = 5000'); // Wait 5 seconds if DB is locked
    } catch (error) {
      console.error('[SQLite] Failed to connect to database:', error);
      throw error; // Re-throw error if connection fails
    }
  }
  return dbInstance;
}

export const db = getDbConnection();

export function initDb() {
  try {
    console.log('[SQLite initDb] Initializing database schema...');

    db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL, -- YYYY-MM-DD
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        categoryId TEXT NOT NULL,
        monthYear TEXT NOT NULL, -- YYYY-MM
        note TEXT,
        performedBy TEXT NOT NULL,
        paymentSource TEXT CHECK(paymentSource IN ('cash', 'bank'))
      );
    `);
    console.log('[SQLite initDb] "transactions" table checked/created.');

    db.exec(`
      CREATE TABLE IF NOT EXISTS shared_notes (
        id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        note_content TEXT DEFAULT '',
        modifiedBy TEXT,
        modifiedAt TEXT -- ISO8601 format
      );
    `);
    console.log('[SQLite initDb] "shared_notes" table checked/created.');

    // Ensure the single row for shared_notes exists
    const ensureNoteRowStmt = db.prepare(`
      INSERT OR IGNORE INTO shared_notes (id, note_content, modifiedBy, modifiedAt) VALUES (1, '', NULL, NULL);
    `);
    ensureNoteRowStmt.run();
    console.log('[SQLite initDb] Ensured single row exists in "shared_notes".');

    console.log('[SQLite initDb] Database schema initialization complete.');
  } catch (error) {
    console.error('[SQLite initDb] Error initializing database schema:', error);
    // Depending on the error, you might want to re-throw or handle it
    // For now, just log it. Application might still work if tables already exist.
  }
}

// Call initDb when this module is loaded to ensure tables are set up.
// This might run multiple times in dev with HMR, but CREATE TABLE IF NOT EXISTS is safe.
initDb();

// Graceful shutdown
if (process.env.NODE_ENV === 'development') {
  process.on('SIGINT', () => {
    if (dbInstance) {
      console.log('[SQLite] Closing database connection due to SIGINT...');
      dbInstance.close();
      console.log('[SQLite] Database connection closed.');
    }
    process.exit(0);
  });

  process.on('SIGTERM', () => {
     if (dbInstance) {
      console.log('[SQLite] Closing database connection due to SIGTERM...');
      dbInstance.close();
      console.log('[SQLite] Database connection closed.');
    }
    process.exit(0);
  });
}
