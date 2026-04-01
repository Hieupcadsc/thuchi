import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/neon';
import { Loan } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// GET /api/loans - List all loans for a family
export async function GET() {
  try {
    const result = await query(
      `SELECT * FROM loans WHERE "familyId" = $1 ORDER BY "createdAt" DESC`,
      ['GIA_DINH']
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching loans:', error);
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 });
  }
}

// POST /api/loans - Create a new loan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lenderName, borrowerName, borrowerPhone, principalAmount, loanDate, dueDate, description, paymentSource } = body;

    if (!lenderName || !borrowerName || !principalAmount || !loanDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const id = `loan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await query(
      `INSERT INTO loans (id, "familyId", "lenderName", "borrowerName", "borrowerPhone", "principalAmount", "loanDate", "dueDate", status, "totalPaidAmount", "remainingAmount", description, "paymentSource", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [id, 'GIA_DINH', lenderName, borrowerName, borrowerPhone || null,
       principalAmount, loanDate, dueDate || null, 'active',
       0, principalAmount, description || null, paymentSource || 'cash', now, now]
    );

    const result = await query('SELECT * FROM loans WHERE id = $1', [id]);
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating loan:', error);
    return NextResponse.json({ error: 'Failed to create loan' }, { status: 500 });
  }
}
