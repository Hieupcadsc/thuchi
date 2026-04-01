import { Pool } from 'pg';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_UZuEDWi6cy9G@ep-falling-salad-a1ds7wib-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

// Helper: run a single query
export async function query(text: string, params?: any[]) {
  const p = getPool();
  return p.query(text, params);
}

/**
 * Initialize all tables in Neon (idempotent – safe to call on every startup)
 */
export async function initNeonDb() {
  const p = getPool();

  await p.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      "familyId" TEXT NOT NULL,
      "performedBy" TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      "categoryId" TEXT NOT NULL,
      "monthYear" TEXT NOT NULL,
      note TEXT,
      "paymentSource" TEXT,
      "createdAt" TEXT
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS shared_notes (
      id TEXT PRIMARY KEY,
      "familyId" TEXT NOT NULL,
      content TEXT DEFAULT '',
      "modifiedBy" TEXT,
      "modifiedAt" TEXT
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      "familyId" TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL DEFAULT 'family',
      date TEXT NOT NULL,
      "isRecurring" BOOLEAN DEFAULT false,
      "recurringPattern" TEXT,
      "isLunarDate" BOOLEAN DEFAULT false,
      "lunarDate" JSONB,
      "createdBy" TEXT NOT NULL,
      color TEXT DEFAULT '#8B5CF6',
      priority TEXT DEFAULT 'medium',
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS work_schedules (
      id TEXT PRIMARY KEY,
      "familyId" TEXT,
      "employeeName" TEXT NOT NULL,
      title TEXT NOT NULL,
      "startTime" TEXT NOT NULL,
      "endTime" TEXT NOT NULL,
      date TEXT NOT NULL,
      "isRecurring" BOOLEAN DEFAULT false,
      location TEXT,
      notes TEXT,
      color TEXT DEFAULT '#4A90E2',
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS sticky_notes (
      id TEXT PRIMARY KEY,
      "familyId" TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      color TEXT DEFAULT 'yellow',
      position JSONB,
      size JSONB,
      "isMinimized" BOOLEAN DEFAULT false,
      "isPinned" BOOLEAN DEFAULT false,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL,
      "createdBy" TEXT NOT NULL,
      "lastModifiedBy" TEXT NOT NULL
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY,
      "familyId" TEXT NOT NULL,
      "lenderName" TEXT NOT NULL,
      "borrowerName" TEXT NOT NULL,
      "borrowerPhone" TEXT,
      "borrowerAddress" TEXT,
      "principalAmount" REAL NOT NULL,
      "interestRate" REAL,
      "loanDate" TEXT NOT NULL,
      "dueDate" TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      "totalPaidAmount" REAL NOT NULL DEFAULT 0,
      "remainingAmount" REAL NOT NULL,
      description TEXT,
      "paymentSource" TEXT NOT NULL DEFAULT 'cash',
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL,
      attachments TEXT DEFAULT '[]'
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS loan_payments (
      id TEXT PRIMARY KEY,
      "loanId" TEXT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
      "paymentAmount" REAL NOT NULL,
      "paymentDate" TEXT NOT NULL,
      "paymentMethod" TEXT NOT NULL,
      note TEXT,
      "createdBy" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL
    );
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      "familyId" INTEGER NOT NULL DEFAULT 1,
      "passwordStrength" TEXT DEFAULT 'weak',
      "passwordChangedAt" TEXT,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    );
  `);

  console.log('[Neon] Database schema initialized');
}
