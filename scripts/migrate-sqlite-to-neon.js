#!/usr/bin/env node
/**
 * Migrate existing SQLite data to Neon PostgreSQL.
 * Run after the app is deployed and Neon is reachable.
 */

const Database = require('better-sqlite3');
const { Client } = require('pg');
const path = require('path');

const NEON_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_UZuEDWi6cy9G@ep-falling-salad-a1ds7wib-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const DB_PATH = path.join(process.cwd(), 'data', 'familybudget.sqlite');

async function main() {
  console.log('📦 Opening SQLite:', DB_PATH);
  const sqlite = new Database(DB_PATH);

  console.log('🔌 Connecting to Neon...');
  const client = new Client({ connectionString: NEON_URL });
  await client.connect();
  console.log('✅ Connected\n');

  // ── transactions ────────────────────────────────────────────────────────────
  const transactions = sqlite.prepare('SELECT * FROM transactions').all();
  console.log(`📤 Migrating ${transactions.length} transactions...`);
  for (const t of transactions) {
    await client.query(
      `INSERT INTO transactions (id,"familyId","performedBy",description,amount,date,type,"categoryId","monthYear",note,"paymentSource","createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
      [t.id, t.userId ?? 'GIA_DINH', t.performedBy, t.description, t.amount,
       t.date, t.type, t.categoryId, t.monthYear, t.note ?? null,
       t.paymentSource ?? null, null]
    ).catch(() => {});
  }

  // ── users ──────────────────────────────────────────────────────────────────
  const users = sqlite.prepare('SELECT * FROM users').all();
  console.log(`📤 Migrating ${users.length} users...`);
  for (const u of users) {
    await client.query(
      `INSERT INTO users (username, password, "familyId", "passwordStrength", "passwordChangedAt", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (username) DO NOTHING`,
      [u.username, u.password, u.familyId, u.passwordStrength,
       u.passwordChangedAt, u.createdAt, u.updatedAt]
    ).catch(() => {});
  }

  // ── loans ──────────────────────────────────────────────────────────────────
  const loans = sqlite.prepare('SELECT * FROM loans').all();
  console.log(`📤 Migrating ${loans.length} loans...`);
  for (const l of loans) {
    await client.query(
      `INSERT INTO loans (id,"familyId","lenderName","borrowerName","borrowerPhone","borrowerAddress","principalAmount","interestRate","loanDate","dueDate",status,"totalPaidAmount","remainingAmount",description,"paymentSource","createdAt","updatedAt",attachments)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) ON CONFLICT (id) DO NOTHING`,
      [l.id, l.familyId, l.lenderName, l.borrowerName, l.borrowerPhone ?? null,
       l.borrowerAddress ?? null, l.principalAmount, l.interestRate ?? null,
       l.loanDate, l.dueDate ?? null, l.status, l.totalPaidAmount, l.remainingAmount,
       l.description ?? null, l.paymentSource ?? 'cash', l.createdAt, l.updatedAt,
       l.attachments ?? '[]']
    ).catch(() => {});
  }

  // ── loan_payments ──────────────────────────────────────────────────────────
  const payments = sqlite.prepare('SELECT * FROM loan_payments').all();
  console.log(`📤 Migrating ${payments.length} loan payments...`);
  for (const p of payments) {
    await client.query(
      `INSERT INTO loan_payments (id,"loanId","paymentAmount","paymentDate","paymentMethod",note,"createdBy","createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
      [p.id, p.loanId, p.paymentAmount, p.paymentDate, p.paymentMethod,
       p.note ?? null, p.createdBy, p.createdAt]
    ).catch(() => {});
  }

  // ── calendar_events ────────────────────────────────────────────────────────
  const events = sqlite.prepare('SELECT * FROM calendar_events').all();
  console.log(`📤 Migrating ${events.length} calendar events...`);
  for (const e of events) {
    const id = `cal_${e.id}`;
    await client.query(
      `INSERT INTO calendar_events (id,"familyId",title,description,type,date,"isRecurring","recurringPattern","isLunarDate","lunarDate","createdBy",color,priority,"createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT (id) DO NOTHING`,
      [id, e.familyId, e.title, e.description ?? null, e.type ?? 'family',
       e.date, e.isRecurring === 1, e.recurringPattern ?? null,
       e.isLunarDate === 1, e.lunarDate ?? null,
       e.createdBy, e.color ?? '#8B5CF6', e.priority ?? 'medium',
       e.createdAt, e.updatedAt ?? null]
    ).catch(() => {});
  }

  // ── work_schedules ─────────────────────────────────────────────────────────
  const schedules = sqlite.prepare('SELECT * FROM work_schedules').all();
  console.log(`📤 Migrating ${schedules.length} work schedules...`);
  for (const s of schedules) {
    const id = `ws_${s.id}`;
    await client.query(
      `INSERT INTO work_schedules (id,"familyId","employeeName",title,"startTime","endTime",date,"isRecurring",location,notes,color,"createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (id) DO NOTHING`,
      [id, null, s.employeeName, s.title, s.startTime, s.endTime,
       s.date, s.isRecurring === 1, s.location ?? null, s.notes ?? null,
       s.color ?? '#4A90E2', s.createdAt, s.updatedAt ?? null]
    ).catch(() => {});
  }

  // ── summary ────────────────────────────────────────────────────────────────
  console.log('\n📊 Neon row counts after migration:');
  for (const table of ['transactions','users','loans','loan_payments','calendar_events','work_schedules']) {
    const r = await client.query(`SELECT COUNT(*) FROM ${table}`);
    console.log(`  ${table}: ${r.rows[0].count}`);
  }

  sqlite.close();
  await client.end();
  console.log('\n🎉 SQLite → Neon migration done!');
}

main().catch(e => { console.error('❌', e); process.exit(1); });
