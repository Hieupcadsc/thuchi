
'use server';

import { format } from 'date-fns';
import { chatWithSpending, type ChatWithSpendingInput, type ChatWithSpendingOutput, type TransactionForChat } from '@/ai/flows/chat-with-spending-flow';
// Đảm bảo import trực tiếp từ constants
import { CATEGORIES, MONTH_NAMES, FAMILY_MEMBERS, FAMILY_ACCOUNT_ID } from '@/lib/constants';
import type { Transaction } from '@/types';
// Không import FAMILY_ACCOUNT_ID từ useAuth ở đây nữa

// Helper to fetch transactions for a given monthYear and familyId
async function fetchTransactionsForMonth(familyId: string, monthYear: string): Promise<Transaction[]> {
  try {
    // Thêm kiểm tra familyId ở đây
    if (!familyId || familyId === 'undefined') {
      console.error('[ChatbotActions fetchTransactionsForMonth] familyId is undefined or the string "undefined". Aborting fetch.');
      // Không throw error ở đây để hàm gọi chính có thể xử lý lỗi chung
      return []; // Trả về mảng rỗng nếu familyId không hợp lệ
    }
    const apiUrl = `/api/transactions?userId=${encodeURIComponent(familyId)}&monthYear=${encodeURIComponent(monthYear)}`;
    
    console.log(`[ChatbotActions] Fetching transactions from: ${apiUrl}`);

    const response = await fetch(apiUrl, { cache: 'no-store' });

    if (!response.ok) {
      let errorData: any = {};
      let responseBodyText = '';
      try {
        responseBodyText = await response.text();
        try {
          errorData = JSON.parse(responseBodyText);
        } catch (e) {
          console.warn("[ChatbotActions fetchTransactionsForMonth] API error response was not valid JSON. Raw text:", responseBodyText);
        }
      } catch (textErr) {
        console.error("[ChatbotActions fetchTransactionsForMonth] Failed to read API error response text:", textErr);
      }
      console.error(
        `[ChatbotActions fetchTransactionsForMonth] Error response from API (status: ${response.status}, statusText: ${response.statusText}) when fetching transactions. Parsed JSON:`,
        errorData,
        responseBodyText ? `Raw Body: "${responseBodyText}"` : "Raw body could not be read."
      );
      
      let finalErrorMessage = 'Không thể tải giao dịch từ server.';
      if (errorData?.message) {
        finalErrorMessage = errorData.message;
      } else if (responseBodyText && responseBodyText.trim() !== '' && !responseBodyText.trim().startsWith('<') && responseBodyText.trim() !== '{}' ) { 
        finalErrorMessage = `Lỗi server: ${responseBodyText.substring(0, 150)}${responseBodyText.length > 150 ? '...' : ''}`;
      } else if (response.statusText) {
        finalErrorMessage = `Lỗi server: ${response.status} ${response.statusText}`;
      }
      throw new Error(finalErrorMessage);
    }
    const transactions: Transaction[] = await response.json();
    console.log(`[ChatbotActions] Fetched ${transactions.length} transactions for ${monthYear}.`);
    return transactions;
  } catch (error: any) {
    console.error(`[ChatbotActions] Error in fetchTransactionsForMonth for ${monthYear}:`, error.message, error.stack);
    // Ném lại lỗi để hàm gọi chính xử lý
    throw error;
  }
}

export async function askSpendingChatbot(userQuestion: string): Promise<ChatWithSpendingOutput | { error: string }> {
  console.log(`[ChatbotActions] askSpendingChatbot called with question: "${userQuestion}"`);
  try {
    // Sử dụng FAMILY_ACCOUNT_ID được import trực tiếp từ constants
    const familyId = FAMILY_ACCOUNT_ID; 
    
    // Kiểm tra sớm nếu FAMILY_ACCOUNT_ID không được import đúng
    if (!familyId) {
        const criticalErrorMsg = "[ChatbotActions askSpendingChatbot] CRITICAL: FAMILY_ACCOUNT_ID is undefined. Check constants.ts and import.";
        console.error(criticalErrorMsg);
        return { error: "Lỗi cấu hình hệ thống: Không thể xác định ID gia đình." };
    }
    if (familyId === 'undefined') { // Kiểm tra trường hợp nó là chuỗi 'undefined'
        const criticalErrorMsg = "[ChatbotActions askSpendingChatbot] CRITICAL: familyId is the string 'undefined'.";
        console.error(criticalErrorMsg);
        return { error: "Lỗi cấu hình hệ thống: ID gia đình không hợp lệ." };
    }


    const currentDate = new Date();
    const currentMonthYear = format(currentDate, 'yyyy-MM');
    
    const currentMonthIndex = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const currentMonthLabel = `${MONTH_NAMES[currentMonthIndex]} ${currentYear}`;

    console.log(`[ChatbotActions] Server current date: ${currentDate.toISOString()}`);
    console.log(`[ChatbotActions] Determined monthYear for query: ${currentMonthYear}`);
    console.log(`[ChatbotActions] Determined currentMonthLabel for AI: ${currentMonthLabel}`);
    console.log(`[ChatbotActions] Using familyId: ${familyId}`);


    let rawTransactions: Transaction[];
    try {
        rawTransactions = await fetchTransactionsForMonth(familyId, currentMonthYear);
    } catch (fetchError: any) {
        console.error(`[ChatbotActions askSpendingChatbot] Failed to fetch transactions for ${currentMonthYear}:`, fetchError.message);
        // Trả về lỗi cho client thay vì để flow AI chạy với mảng rỗng nếu không có ý định
        return { error: `Không thể lấy dữ liệu giao dịch: ${fetchError.message}` };
    }


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
    console.error("[ChatbotActions] Error in askSpendingChatbot server action:", error.message, error.stack);
    return { error: error.message || "Đã có lỗi xảy ra khi trò chuyện với AI." };
  }
}
