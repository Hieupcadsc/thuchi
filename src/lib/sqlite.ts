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

      // Create loans table
  db.exec(`
    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      familyId INTEGER NOT NULL,
      lenderName TEXT NOT NULL,
      borrowerName TEXT NOT NULL,
      borrowerPhone TEXT,
      principalAmount REAL NOT NULL,
      loanDate TEXT NOT NULL,
      dueDate TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      totalPaidAmount REAL DEFAULT 0,
      remainingAmount REAL NOT NULL,
      description TEXT,
      paymentSource TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);
    console.log('[SQLite initDb] "loans" table checked/created.');

    // Create loan_payments table
    db.exec(`
      CREATE TABLE IF NOT EXISTS loan_payments (
        id TEXT PRIMARY KEY,
        loanId TEXT NOT NULL,
        paymentAmount REAL NOT NULL,
        paymentDate TEXT NOT NULL, -- YYYY-MM-DD
        paymentMethod TEXT NOT NULL CHECK(paymentMethod IN ('cash', 'bank')),
        note TEXT,
        createdBy TEXT NOT NULL,
        createdAt TEXT NOT NULL, -- ISO8601 format
        FOREIGN KEY (loanId) REFERENCES loans(id) ON DELETE CASCADE
      );
    `);
    console.log('[SQLite initDb] "loan_payments" table checked/created.');

    // Create calendar_events table
    db.exec(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        familyId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL DEFAULT 'family',
        date TEXT NOT NULL, -- YYYY-MM-DD
        isRecurring INTEGER DEFAULT 0,
        recurringPattern TEXT,
        isLunarDate INTEGER DEFAULT 0,
        lunarDate TEXT, -- JSON string
        createdBy TEXT NOT NULL,
        color TEXT DEFAULT '#8B5CF6',
        priority TEXT DEFAULT 'medium',
        createdAt TEXT NOT NULL,
        updatedAt TEXT
      );
    `);
    console.log('[SQLite initDb] "calendar_events" table checked/created.');

    // Create work_schedules table
    db.exec(`
      CREATE TABLE IF NOT EXISTS work_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employeeName TEXT NOT NULL,
        title TEXT NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT NOT NULL,
        date TEXT NOT NULL, -- YYYY-MM-DD
        isRecurring INTEGER DEFAULT 0,
        location TEXT,
        notes TEXT,
        color TEXT DEFAULT '#4A90E2',
        createdAt TEXT NOT NULL,
        updatedAt TEXT
      );
    `);
    console.log('[SQLite initDb] "work_schedules" table checked/created.');

    // Create users table for password management
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        familyId INTEGER NOT NULL,
        passwordStrength TEXT DEFAULT 'weak',
        passwordChangedAt TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);
    console.log('[SQLite initDb] "users" table checked/created.');

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

// Auto-restore on startup (for Replit/ephemeral environments)
if (process.env.NODE_ENV === 'production') {
  import('./backup').then(({ restoreDatabase, scheduleAutoBackup }) => {
    restoreDatabase().catch(console.error);
    scheduleAutoBackup();
  });
}

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
