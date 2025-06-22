import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/sqlite';
import type { LoanPayment } from '@/types';
import { THU_NO_CATEGORY_ID } from '@/lib/constants';

// GET /api/loans/[loanId]/payments - Get all payments for a loan
export async function GET(
  request: NextRequest,
  { params }: { params: { loanId: string } }
) {
  try {
    const { loanId } = params;

    if (!loanId) {
      return NextResponse.json({ error: 'loanId is required' }, { status: 400 });
    }

    const stmt = db.prepare('SELECT * FROM loan_payments WHERE loanId = ? ORDER BY paymentDate DESC');
    const rows = stmt.all(loanId);

    const payments: LoanPayment[] = rows.map((row: any) => ({
      id: row.id,
      loanId: row.loanId,
      paymentAmount: row.paymentAmount,
      paymentDate: row.paymentDate,
      paymentMethod: row.paymentMethod,
      note: row.note,
      createdBy: row.createdBy,
      createdAt: row.createdAt
    }));

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Error fetching loan payments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/loans/[loanId]/payments - Record a payment for a loan
export async function POST(
  request: NextRequest,
  { params }: { params: { loanId: string } }
) {
  try {
    const { loanId } = params;
    const body = await request.json();
    const {
      paymentAmount,
      paymentDate,
      paymentMethod,
      note,
      createdBy
    } = body;

    // Validation
    if (!loanId || !paymentAmount || !paymentDate || !paymentMethod || !createdBy) {
      return NextResponse.json({ 
        error: 'Missing required fields: paymentAmount, paymentDate, paymentMethod, createdBy' 
      }, { status: 400 });
    }

    // Check if loan exists
    const loanStmt = db.prepare('SELECT * FROM loans WHERE id = ?');
    const loan = loanStmt.get(loanId) as any;

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Validate payment amount
    if (paymentAmount <= 0 || paymentAmount > loan.remainingAmount) {
      return NextResponse.json({ 
        error: `Payment amount must be between 0 and ${loan.remainingAmount}` 
      }, { status: 400 });
    }

    const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // Start transaction
    const transaction = db.transaction(() => {
      // Insert payment record
      const insertPaymentStmt = db.prepare(`
        INSERT INTO loan_payments (
          id, loanId, paymentAmount, paymentDate, paymentMethod, note, createdBy, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertPaymentStmt.run(
        paymentId, loanId, paymentAmount, paymentDate, paymentMethod, note, createdBy, now
      );

      // Update loan totals
      const newTotalPaid = loan.totalPaidAmount + paymentAmount;
      const newRemainingAmount = loan.remainingAmount - paymentAmount;
      
      // Determine new status
      let newStatus = loan.status;
      if (newRemainingAmount <= 0) {
        newStatus = 'completed';
      } else if (newRemainingAmount < loan.remainingAmount) {
        newStatus = loan.status === 'active' ? 'partially_paid' : loan.status;
      }

      const updateLoanStmt = db.prepare(`
        UPDATE loans 
        SET totalPaidAmount = ?, remainingAmount = ?, status = ?, updatedAt = ?
        WHERE id = ?
      `);

      updateLoanStmt.run(newTotalPaid, newRemainingAmount, newStatus, now, loanId);

      // Create transaction record for the payment (income)
      const transactionId = `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const monthYear = paymentDate.substring(0, 7); // YYYY-MM

      const transactionStmt = db.prepare(`
        INSERT INTO transactions (
          id, userId, description, amount, date, type, categoryId, monthYear,
          note, performedBy, paymentSource
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      transactionStmt.run(
        transactionId, loan.familyId, `Thu nợ từ: ${loan.borrowerName}`, paymentAmount,
        paymentDate, 'income', THU_NO_CATEGORY_ID, monthYear,
        `Thu ${paymentAmount.toLocaleString('vi-VN')}₫ từ ${loan.borrowerName}${note ? ` - ${note}` : ''}`, 
        createdBy, paymentMethod
      );
    });

    transaction();

    // Get the created payment
    const selectStmt = db.prepare('SELECT * FROM loan_payments WHERE id = ?');
    const row = selectStmt.get(paymentId) as any;

    const payment: LoanPayment = {
      id: row.id,
      loanId: row.loanId,
      paymentAmount: row.paymentAmount,
      paymentDate: row.paymentDate,
      paymentMethod: row.paymentMethod,
      note: row.note,
      createdBy: row.createdBy,
      createdAt: row.createdAt
    };

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    console.error('Error creating loan payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 