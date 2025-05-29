
'use server';

import { format } from 'date-fns';
import { chatWithSpending, type ChatWithSpendingInput, type ChatWithSpendingOutput, type TransactionForChat } from '@/ai/flows/chat-with-spending-flow';
import { CATEGORIES, MONTH_NAMES, FAMILY_MEMBERS } from '@/lib/constants'; // Import FAMILY_MEMBERS from constants
import type { Transaction } from '@/types';
import { FAMILY_ACCOUNT_ID } from '@/hooks/useAuth'; // FAMILY_ACCOUNT_ID is fine here

// Helper to fetch transactions for a given monthYear and familyId
async function fetchTransactionsForMonth(familyId: string, monthYear: string): Promise<Transaction[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'; 
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
        date: t.date, 
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
      familyName: `gia đình ${FAMILY_MEMBERS.join(' và ')}`, // This will now work
    };
    
    const result = await chatWithSpending(chatbotInput);
    return result;

  } catch (error: any) {
    console.error("Error in askSpendingChatbot server action:", error);
    return { error: error.message || "Đã có lỗi xảy ra khi trò chuyện với AI." };
  }
}
