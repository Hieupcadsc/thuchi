'use server';

import { format, subMonths } from 'date-fns';
import { analyzeFamilySpending, type AnalyzeSpendingInput, type AnalyzeSpendingOutput, type TransactionForAnalysis } from '@/ai/flows/analyze-spending-flow';
import { CATEGORIES, MONTH_NAMES } from '@/lib/constants';
import type { Transaction, FamilyMember } from '@/types';
import { FAMILY_ACCOUNT_ID } from '@/hooks/useAuth'; // Assuming this is the constant for familyId

// Helper to fetch transactions for a given monthYear and familyId
// This simulates calling your existing API endpoint or directly accessing data
// In a real scenario, you might call your DB or Google Sheets API here.
async function fetchTransactionsForMonth(familyId: string, monthYear: string): Promise<Transaction[]> {
  // IMPORTANT: This needs to be adapted to your actual data fetching mechanism.
  // For now, this simulates fetching from an API endpoint like the one you have.
  // You might need to use 'node-fetch' or similar if running in a Node.js server action context
  // that doesn't have browser 'fetch' readily available for external APIs,
  // or preferably, refactor data access logic to be callable from server-side.

  // For Firebase Studio, let's assume we can use fetch to call our own API routes
  // The URL should be absolute if called from server-to-server or from a different origin.
  // If deployed, ensure NEXT_PUBLIC_APP_URL is set. For local dev, http://localhost:PORT
  // For now, to avoid complexity of setting up absolute URLs, this function would ideally
  // have direct access to the Google Sheets logic if this action runs server-side.
  // Given the constraints, we'll make a placeholder.
  // console.log(`Fetching transactions for ${familyId} - ${monthYear} via API`);
  try {
    // This will only work if the server action is running in an environment where it can resolve this relative URL to itself,
    // or if you provide an absolute URL.
    // For demonstration, we'll assume this path correctly resolves.
    // In a real app, you'd use an absolute URL: `process.env.NEXT_PUBLIC_APP_URL + `/api/transactions?userId=${familyId}&monthYear=${monthYear}`
    // For now, we will return an empty array and log a warning, as server actions can't easily call relative API routes of the same app.
    // This part needs to be robustly implemented based on your deployment.
    
    // Simulate calling the existing API. In a real app, you'd use an absolute URL or refactor data access.
    // This is a simplification for the current environment.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'; // Adjust port if needed
    const response = await fetch(`${baseUrl}/api/transactions?userId=${encodeURIComponent(familyId)}&monthYear=${encodeURIComponent(monthYear)}`);

    if (!response.ok) {
      console.error(`Failed to fetch transactions for ${monthYear}: ${response.statusText}`);
      return [];
    }
    const transactions: Transaction[] = await response.json();
    return transactions;
  } catch (error) {
    console.error(`Error fetching transactions for ${monthYear}:`, error);
    return [];
  }
}


export async function getFinancialAnalysis(): Promise<AnalyzeSpendingOutput | { error: string }> {
  try {
    const familyId = FAMILY_ACCOUNT_ID; // Use the shared family account ID
    const currentDate = new Date();
    const currentMonthYear = format(currentDate, 'yyyy-MM');
    const previousMonthDate = subMonths(currentDate, 1);
    const previousMonthYear = format(previousMonthDate, 'yyyy-MM');

    const [currentMonthRawTransactions, previousMonthRawTransactions] = await Promise.all([
      fetchTransactionsForMonth(familyId, currentMonthYear),
      fetchTransactionsForMonth(familyId, previousMonthYear),
    ]);

    const mapTransaction = (t: Transaction): TransactionForAnalysis => {
      const category = CATEGORIES.find(c => c.id === t.categoryId);
      return {
        description: t.description,
        amount: t.amount,
        type: t.type,
        categoryName: category?.name || 'Không xác định',
        date: t.date, // Assuming t.date is already 'YYYY-MM-DD'
        performedBy: t.performedBy,
      };
    };

    const currentMonthTransactions = currentMonthRawTransactions.map(mapTransaction);
    const previousMonthTransactions = previousMonthRawTransactions.map(mapTransaction);
    
    const currentMonthIndex = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const previousMonthIndex = previousMonthDate.getMonth();
    const previousYear = previousMonthDate.getFullYear();


    const analysisInput: AnalyzeSpendingInput = {
      currentMonthTransactions,
      previousMonthTransactions,
      allCategories: CATEGORIES.map(c => ({ id: c.id, name: c.name, type: c.type })),
      currentMonthLabel: `${MONTH_NAMES[currentMonthIndex]} ${currentYear}`,
      previousMonthLabel: `${MONTH_NAMES[previousMonthIndex]} ${previousYear}`,
      familyName: "gia đình Minh Đan và Minh Hiếu",
    };
    
    // console.log("Sending to AI:", JSON.stringify(analysisInput, null, 2));
    const result = await analyzeFamilySpending(analysisInput);
    return result;

  } catch (error: any) {
    console.error("Error in getFinancialAnalysis server action:", error);
    return { error: error.message || "Đã có lỗi xảy ra khi phân tích tài chính." };
  }
}
