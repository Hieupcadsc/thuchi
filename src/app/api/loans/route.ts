import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/sqlite';
import { Loan } from '@/types';

// GET /api/loans - List all loans for a family
export async function GET() {
  try {
    const loans = db.prepare(`
      SELECT * FROM loans 
      WHERE familyId = 1 
      ORDER BY createdAt DESC
    `).all() as Loan[];

    return NextResponse.json(loans);
  } catch (error) {
    console.error('Error fetching loans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loans' },
      { status: 500 }
    );
  }
}

// POST /api/loans - Create a new loan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      lenderName,
      borrowerName,
      borrowerPhone,
      principalAmount,
      loanDate,
      dueDate,
      description,
      paymentSource,
    } = body;

    // Validation
    if (!lenderName || !borrowerName || !principalAmount || !loanDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Create loan record
    const loanResult = db.prepare(`
      INSERT INTO loans (
        familyId, lenderName, borrowerName, borrowerPhone,
        principalAmount, loanDate, dueDate, status,
        totalPaidAmount, remainingAmount, description,
        paymentSource, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      1, // familyId
      lenderName,
      borrowerName,
      borrowerPhone || null,
      principalAmount,
      loanDate,
      dueDate || null,
      'active',
      0, // totalPaidAmount
      principalAmount, // remainingAmount
      description || null,
      paymentSource || 'cash',
      now,
      now
    );

    // Create corresponding transaction (money going out)
    db.prepare(`
      INSERT INTO transactions (
        familyId, amount, category, description, date,
        paymentMethod, location, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      1, // familyId
      -Math.abs(principalAmount), // Negative for outgoing money
      'Cho mượn tiền',
      `Cho ${borrowerName} mượn tiền${description ? ` - ${description}` : ''}`,
      loanDate,
      paymentSource || 'cash',
      'Loan',
      now,
      now
    );

    const newLoan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanResult.lastInsertRowid) as Loan;

    return NextResponse.json(newLoan, { status: 201 });
  } catch (error) {
    console.error('Error creating loan:', error);
    return NextResponse.json(
      { error: 'Failed to create loan' },
      { status: 500 }
    );
  }
} 