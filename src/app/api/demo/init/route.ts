import { NextRequest, NextResponse } from 'next/server';
import { firestoreService } from '@/lib/firestore-service';
import { DEMO_TRANSACTIONS } from '@/lib/demo-data';
import { DEMO_ACCOUNT_ID, DEMO_USER } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const { username, forceRefresh } = await request.json();

    // Only allow demo user to initialize demo data
    if (username !== DEMO_USER) {
      return NextResponse.json(
        { error: 'Unauthorized - Only demo user can initialize demo data' },
        { status: 403 }
      );
    }

    // If not force refresh, check if demo data already exists
    if (!forceRefresh) {
      try {
        const existingTransactions = await firestoreService.getTransactionsByMonth(DEMO_ACCOUNT_ID, '2024-01');
        
        if (existingTransactions.length > 0) {
          return NextResponse.json({
            success: true,
            message: 'Demo data already exists',
            transactionCount: existingTransactions.length
          });
        }
      } catch (error) {
        // If Firestore fails, continue with initialization
        console.log('Firestore check failed, continuing with demo init...');
      }
    }

    // For Demo user, just return the demo data (will be saved to localStorage by client)
    const demoTransactions = DEMO_TRANSACTIONS.map((data, index) => ({
      id: `demo-${Date.now()}-${index}`,
      ...data
    }));

    return NextResponse.json({
      success: true,
      message: 'Demo data prepared successfully',
      transactionCount: demoTransactions.length,
      transactions: demoTransactions
    });

  } catch (error) {
    console.error('Error initializing demo data:', error);
    return NextResponse.json(
      { error: 'Failed to initialize demo data' },
      { status: 500 }
    );
  }
}
