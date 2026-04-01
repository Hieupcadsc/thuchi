/**
 * Neon PostgreSQL service – drop-in replacement for firestore-service.ts
 * All functions mirror the firestoreService API exactly.
 */
import { query } from './neon';
import { v4 as uuidv4 } from 'uuid';
import type { Transaction, SharedNote, CalendarEvent, WorkSchedule, StickyNote } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Transactions
// ─────────────────────────────────────────────────────────────────────────────

export const neonService = {
  async addTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const id = uuidv4();
    const t = { id, ...transaction };
    await query(
      `INSERT INTO transactions (id, "familyId", "performedBy", description, amount, date, type, "categoryId", "monthYear", note, "paymentSource", "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [t.id, t.familyId, t.performedBy, t.description, t.amount, t.date, t.type,
       t.categoryId, t.monthYear, t.note ?? null, t.paymentSource ?? null, t.createdAt ?? new Date().toISOString()]
    );
    return t;
  },

  async getTransactionsByMonth(familyId: string, monthYear: string): Promise<Transaction[]> {
    const result = await query(
      `SELECT * FROM transactions WHERE "familyId" = $1 AND "monthYear" = $2 ORDER BY "createdAt" DESC NULLS LAST, date DESC`,
      [familyId, monthYear]
    );
    return result.rows as Transaction[];
  },

  async getAllTransactions(familyId: string): Promise<Transaction[]> {
    const result = await query(
      `SELECT * FROM transactions WHERE "familyId" = $1 ORDER BY "createdAt" DESC NULLS LAST, date DESC`,
      [familyId]
    );
    return result.rows as Transaction[];
  },

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
    const fields = Object.entries(updates)
      .filter(([, v]) => v !== undefined)
      .map(([k], i) => `"${k}" = $${i + 2}`)
      .join(', ');
    const values = Object.values(updates).filter(v => v !== undefined);
    if (!fields) return;
    await query(`UPDATE transactions SET ${fields} WHERE id = $1`, [id, ...values]);
  },

  async deleteTransaction(transactionId: string): Promise<void> {
    await query('DELETE FROM transactions WHERE id = $1', [transactionId]);
  },

  async bulkDeleteTransactions(transactionIds: string[]): Promise<void> {
    if (transactionIds.length === 0) return;
    const placeholders = transactionIds.map((_, i) => `$${i + 1}`).join(', ');
    await query(`DELETE FROM transactions WHERE id IN (${placeholders})`, transactionIds);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Shared notes
  // ─────────────────────────────────────────────────────────────────────────

  async getSharedNote(familyId: string): Promise<{ content: string; modifiedBy?: string; modifiedAt?: string } | null> {
    const result = await query(
      'SELECT * FROM shared_notes WHERE "familyId" = $1 LIMIT 1',
      [familyId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return { content: row.content || '', modifiedBy: row.modifiedBy, modifiedAt: row.modifiedAt };
  },

  async updateSharedNote(familyId: string, content: string, modifiedBy: string): Promise<void> {
    const existing = await query('SELECT id FROM shared_notes WHERE "familyId" = $1', [familyId]);
    const now = new Date().toISOString();
    if (existing.rows.length === 0) {
      const id = uuidv4();
      await query(
        `INSERT INTO shared_notes (id, "familyId", content, "modifiedBy", "modifiedAt") VALUES ($1,$2,$3,$4,$5)`,
        [id, familyId, content, modifiedBy, now]
      );
    } else {
      await query(
        `UPDATE shared_notes SET content=$1, "modifiedBy"=$2, "modifiedAt"=$3 WHERE "familyId"=$4`,
        [content, modifiedBy, now, familyId]
      );
    }
  },

  async getAllSharedNotes(familyId: string): Promise<SharedNote[]> {
    const result = await query('SELECT * FROM shared_notes WHERE "familyId" = $1', [familyId]);
    return result.rows as SharedNote[];
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Calendar events
  // ─────────────────────────────────────────────────────────────────────────

  async getCalendarEvents(familyId: string): Promise<CalendarEvent[]> {
    const result = await query(
      'SELECT * FROM calendar_events WHERE "familyId" = $1 ORDER BY date ASC',
      [familyId]
    );
    return result.rows.map(row => ({
      ...row,
      lunarDate: row.lunarDate ?? undefined,
    })) as CalendarEvent[];
  },

  async addCalendarEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    const id = uuidv4();
    const now = new Date().toISOString();
    await query(
      `INSERT INTO calendar_events (id, "familyId", title, description, type, date, "isRecurring", "recurringPattern", "isLunarDate", "lunarDate", "createdBy", color, priority, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [id, event.familyId, event.title, event.description ?? null, event.type ?? 'family',
       event.date, event.isRecurring ?? false, event.recurringPattern ?? null,
       event.isLunarDate ?? false,
       event.lunarDate ? JSON.stringify(event.lunarDate) : null,
       event.createdBy, event.color ?? '#8B5CF6', event.priority ?? 'medium', now, now]
    );
    return { id, ...event };
  },

  async updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): Promise<void> {
    const cols = Object.entries(updates).filter(([, v]) => v !== undefined);
    if (cols.length === 0) return;
    const setClause = cols.map(([k], i) => `"${k}" = $${i + 2}`).join(', ');
    const values = cols.map(([k, v]) => k === 'lunarDate' ? JSON.stringify(v) : v);
    await query(`UPDATE calendar_events SET ${setClause} WHERE id = $1`, [id, ...values]);
  },

  async deleteCalendarEvent(eventId: string): Promise<void> {
    await query('DELETE FROM calendar_events WHERE id = $1', [eventId]);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Work schedules
  // ─────────────────────────────────────────────────────────────────────────

  async getWorkSchedules(familyId: string): Promise<WorkSchedule[]> {
    const result = await query(
      'SELECT * FROM work_schedules WHERE "familyId" = $1 OR "familyId" IS NULL ORDER BY date ASC',
      [familyId]
    );
    return result.rows as WorkSchedule[];
  },

  async addWorkSchedule(schedule: Omit<WorkSchedule, 'id'>): Promise<WorkSchedule> {
    const id = uuidv4();
    const now = new Date().toISOString();
    await query(
      `INSERT INTO work_schedules (id, "familyId", "employeeName", title, "startTime", "endTime", date, "isRecurring", location, notes, color, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [id, schedule.familyId ?? null, schedule.employeeName, schedule.title,
       schedule.startTime, schedule.endTime, schedule.date,
       schedule.isRecurring ?? false, schedule.location ?? null,
       schedule.notes ?? null, schedule.color ?? '#4A90E2', now, now]
    );
    return { id, ...schedule };
  },

  async updateWorkSchedule(id: string, updates: Partial<WorkSchedule>): Promise<void> {
    const cols = Object.entries(updates).filter(([, v]) => v !== undefined);
    if (cols.length === 0) return;
    const setClause = cols.map(([k], i) => `"${k}" = $${i + 2}`).join(', ');
    const values = cols.map(([, v]) => v);
    await query(`UPDATE work_schedules SET ${setClause} WHERE id = $1`, [id, ...values]);
  },

  async deleteWorkSchedule(scheduleId: string): Promise<void> {
    await query('DELETE FROM work_schedules WHERE id = $1', [scheduleId]);
  },

  async deleteWorkSchedulesByEmployeeAndMonth(
    familyId: string,
    employeeName: string,
    year: number,
    month: number
  ): Promise<void> {
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    await query(
      `DELETE FROM work_schedules WHERE "familyId" = $1 AND "employeeName" = $2 AND date LIKE $3`,
      [familyId, employeeName, `${monthPrefix}%`]
    );
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Sticky notes
  // ─────────────────────────────────────────────────────────────────────────

  async getStickyNotes(familyId: string): Promise<StickyNote[]> {
    const result = await query(
      `SELECT * FROM sticky_notes WHERE "familyId" = $1 ORDER BY "isPinned" DESC, "updatedAt" DESC`,
      [familyId]
    );
    return result.rows as StickyNote[];
  },

  async addStickyNote(note: Omit<StickyNote, 'id'>): Promise<StickyNote> {
    const id = uuidv4();
    await query(
      `INSERT INTO sticky_notes (id, "familyId", title, content, color, position, size, "isMinimized", "isPinned", "createdAt", "updatedAt", "createdBy", "lastModifiedBy")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [id, note.familyId, note.title, note.content, note.color,
       note.position ? JSON.stringify(note.position) : null,
       note.size ? JSON.stringify(note.size) : null,
       note.isMinimized ?? false, note.isPinned ?? false,
       note.createdAt, note.updatedAt, note.createdBy, note.lastModifiedBy]
    );
    return { id, ...note };
  },

  async updateStickyNote(id: string, updates: Partial<StickyNote>): Promise<void> {
    const cols = Object.entries(updates).filter(([, v]) => v !== undefined);
    if (cols.length === 0) return;
    const setClause = cols.map(([k], i) => {
      return `"${k}" = $${i + 2}`;
    }).join(', ');
    const values = cols.map(([k, v]) => {
      if (k === 'position' || k === 'size') return v ? JSON.stringify(v) : null;
      return v;
    });
    await query(`UPDATE sticky_notes SET ${setClause} WHERE id = $1`, [id, ...values]);
  },

  async deleteStickyNote(noteId: string): Promise<void> {
    await query('DELETE FROM sticky_notes WHERE id = $1', [noteId]);
  },

  async bulkDeleteStickyNotes(noteIds: string[]): Promise<void> {
    if (noteIds.length === 0) return;
    const placeholders = noteIds.map((_, i) => `$${i + 1}`).join(', ');
    await query(`DELETE FROM sticky_notes WHERE id IN (${placeholders})`, noteIds);
  },
};
