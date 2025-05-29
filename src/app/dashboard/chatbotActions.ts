
'use server';

import { format, subMonths } from 'date-fns'; // Added subMonths for potential future use, format is key
import { chatWithSpending, type ChatWithSpendingInput, type ChatWithSpendingOutput, type TransactionForChat } from '@/ai/flows/chat-with-spending-flow';
import { CATEGORIES, MONTH_NAMES, FAMILY_MEMBERS } from '@/lib/constants';
import type { Transaction } from '@/types';
import { FAMILY_ACCOUNT_ID } from '@/hooks/useAuth';

// Helper to fetch transactions for a given monthYear and familyId
async function fetchTransactionsForMonth(familyId: string, monthYear: string): Promise<Transaction[]> {
  try {
    // Ensure NEXT_PUBLIC_APP_URL is set in your .env.local or .env file for deployed environments
    // For local development, ensure the port matches your running app.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 9003}`; // Updated port to 9003
    const apiUrl = `${appUrl}/api/transactions?userId=${encodeURIComponent(familyId)}&monthYear=${encodeURIComponent(monthYear)}`;
    
    console.log(`[ChatbotActions] Fetching transactions from: ${apiUrl}`);

    const response = await fetch(apiUrl, { cache: 'no-store' }); // Disable cache to ensure fresh data

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[ChatbotActions] Failed to fetch transactions for ${monthYear}. Status: ${response.status}, Response:`, errorData);
      throw new Error(errorData.message || `Không thể tải giao dịch cho tháng ${monthYear}.`);
    }
    const transactions: Transaction[] = await response.json();
    console.log(`[ChatbotActions] Fetched ${transactions.length} transactions for ${monthYear}.`);
    return transactions;
  } catch (error) {
    console.error(`[ChatbotActions] Error in fetchTransactionsForMonth for ${monthYear}:`, error);
    throw error;
  }
}

export async function askSpendingChatbot(userQuestion: string): Promise<ChatWithSpendingOutput | { error: string }> {
  console.log(`[ChatbotActions] askSpendingChatbot called with question: "${userQuestion}"`);
  try {
    const familyId = FAMILY_ACCOUNT_ID;
    const currentDate = new Date(); // This is the server's current date
    const currentMonthYear = format(currentDate, 'yyyy-MM'); // e.g., "2024-07"
    
    const currentMonthIndex = currentDate.getMonth(); // e.g., 6 for July
    const currentYear = currentDate.getFullYear(); // e.g., 2024
    const currentMonthLabel = `${MONTH_NAMES[currentMonthIndex]} ${currentYear}`; // e.g., "Tháng 7 2024"

    console.log(`[ChatbotActions] Server current date: ${currentDate.toISOString()}`);
    console.log(`[ChatbotActions] Determined monthYear for query: ${currentMonthYear}`);
    console.log(`[ChatbotActions] Determined currentMonthLabel for AI: ${currentMonthLabel}`);

    const rawTransactions = await fetchTransactionsForMonth(familyId, currentMonthYear);

    const mapTransactionToChatFormat = (t: Transaction): TransactionForChat => {
      const category = CATEGORIES.find(c => c.id === t.categoryId);
      return {
        description: t.description,
        amount: t.amount,
        type: t.type,
        categoryName: category?.name || 'Không xác định',
        date: t.date,
        performedBy: t.performedBy,
      };
    };

    const transactionsForChat = rawTransactions.map(mapTransactionToChatFormat);
    
    const chatbotInput: ChatWithSpendingInput = {
      userQuestion,
      transactions: transactionsForChat,
      currentMonthLabel: currentMonthLabel,
      familyName: `gia đình ${FAMILY_MEMBERS.join(' và ')}`,
    };
    
    console.log('[ChatbotActions] Input being sent to AI flow:', JSON.stringify(chatbotInput, null, 2));
    
    const result = await chatWithSpending(chatbotInput);
    console.log('[ChatbotActions] Raw AI response:', result);
    return result;

  } catch (error: any) {
    console.error("[ChatbotActions] Error in askSpendingChatbot server action:", error);
    return { error: error.message || "Đã có lỗi xảy ra khi trò chuyện với AI." };
  }
}
