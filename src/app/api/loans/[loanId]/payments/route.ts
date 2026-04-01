import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/neon';
import type { LoanPayment } from '@/types';
import { THU_NO_CATEGORY_ID } from '@/lib/constants';

// GET /api/loans/[loanId]/payments
export async function GET(
  request: NextRequest,
  { params }: { params: { loanId: string } }
) {
  try {
    const { loanId } = params;
    if (!loanId) return NextResponse.json({ error: 'loanId is required' }, { status: 400 });

    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM loan_payments WHERE "loanId" = $1 ORDER BY "paymentDate" DESC',
      [loanId]
    );
    return NextResponse.json({ payments: result.rows });
  } catch (error) {
    console.error('Error fetching loan payments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/loans/[loanId]/payments
export async function POST(
  request: NextRequest,
  { params }: { params: { loanId: string } }
) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const { loanId } = params;
    const body = await request.json();
    const { paymentAmount, paymentDate, paymentMethod, note, createdBy } = body;

    if (!loanId || !paymentAmount || !paymentDate || !paymentMethod || !createdBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const loanResult = await client.query('SELECT * FROM loans WHERE id = $1', [loanId]);
    const loan = loanResult.rows[0];
    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });

    if (paymentAmount <= 0 || paymentAmount > loan.remainingAmount) {
      return NextResponse.json({ error: `Payment amount must be between 0 and ${loan.remainingAmount}` }, { status: 400 });
    }

    const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const newTotalPaid = loan.totalPaidAmount + paymentAmount;
    const newRemainingAmount = loan.remainingAmount - paymentAmount;
    const newStatus = newRemainingAmount <= 0 ? 'completed' :
      loan.status === 'active' ? 'partially_paid' : loan.status;

    await client.query('BEGIN');

    await client.query(
      `INSERT INTO loan_payments (id, "loanId", "paymentAmount", "paymentDate", "paymentMethod", note, "createdBy", "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [paymentId, loanId, paymentAmount, paymentDate, paymentMethod, note || null, createdBy, now]
    );

    await client.query(
      `UPDATE loans SET "totalPaidAmount"=$1, "remainingAmount"=$2, status=$3, "updatedAt"=$4 WHERE id=$5`,
      [newTotalPaid, newRemainingAmount, newStatus, now, loanId]
    );

    // Create income transaction for payment received
    const transactionId = `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const monthYear = paymentDate.substring(0, 7);
    await client.query(
      `INSERT INTO transactions (id, "familyId", "performedBy", description, amount, date, type, "categoryId", "monthYear", note, "paymentSource", "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [transactionId, loan.familyId, createdBy,
       `Thu nợ từ: ${loan.borrowerName}`, paymentAmount,
       paymentDate, 'income', THU_NO_CATEGORY_ID, monthYear,
       `Thu ${Number(paymentAmount).toLocaleString('vi-VN')}₫ từ ${loan.borrowerName}${note ? ` - ${note}` : ''}`,
       paymentMethod, now]
    );

    await client.query('COMMIT');

    const paymentRow = await client.query('SELECT * FROM loan_payments WHERE id = $1', [paymentId]);
    return NextResponse.json({ payment: paymentRow.rows[0] }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating loan payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}
