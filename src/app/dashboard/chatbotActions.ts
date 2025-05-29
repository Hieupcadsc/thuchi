
'use server';

import { format } from 'date-fns';
import { chatWithSpending, type ChatWithSpendingInput, type ChatWithSpendingOutput, type TransactionForChat } from '@/ai/flows/chat-with-spending-flow';
import { CATEGORIES, MONTH_NAMES } from '@/lib/constants';
import type { Transaction } from '@/types';
import { FAMILY_ACCOUNT_ID, FAMILY_MEMBERS } from '@/hooks/useAuth';

// Helper to fetch transactions for a given monthYear and familyId
// This simulates calling your existing API endpoint or directly accessing data.
async function fetchTransactionsForMonth(familyId: string, monthYear: string): Promise<Transaction[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'; // Adjust port if needed
    const response = await fetch(`${baseUrl}/api/transactions?userId=${encodeURIComponent(familyId)}&monthYear=${encodeURIComponent(monthYear)}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Failed to fetch transactions for ${monthYear}: ${response.statusText}`, errorData);
      throw new Error(errorData.message || `Không thể tải giao dịch cho tháng ${monthYear}.`);
    }
    const transactions: Transaction[] = await response.json();
    return transactions;
  } catch (error) {
    console.error(`Error fetching transactions for ${monthYear}:`, error);
    // Re-throw or return a specific error structure if needed by the caller
    throw error;
  }
}

export async function askSpendingChatbot(userQuestion: string): Promise<ChatWithSpendingOutput | { error: string }> {
  try {
    const familyId = FAMILY_ACCOUNT_ID;
    const currentDate = new Date();
    const currentMonthYear = format(currentDate, 'yyyy-MM');

    const rawTransactions = await fetchTransactionsForMonth(familyId, currentMonthYear);

    const mapTransactionToChatFormat = (t: Transaction): TransactionForChat => {
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

    const transactionsForChat = rawTransactions.map(mapTransactionToChatFormat);
    
    const currentMonthIndex = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const chatbotInput: ChatWithSpendingInput = {
      userQuestion,
      transactions: transactionsForChat,
      currentMonthLabel: `${MONTH_NAMES[currentMonthIndex]} ${currentYear}`,
      familyName: `gia đình ${FAMILY_MEMBERS.join(' và ')}`,
    };
    
    // console.log("Sending to Chatbot AI:", JSON.stringify(chatbotInput, null, 2));
    const result = await chatWithSpending(chatbotInput);
    return result;

  } catch (error: any) {
    console.error("Error in askSpendingChatbot server action:", error);
    return { error: error.message || "Đã có lỗi xảy ra khi trò chuyện với AI." };
  }
}
