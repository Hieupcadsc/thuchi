
'use server';

import { format } from 'date-fns';
import { chatWithSpending, type ChatWithSpendingInput, type ChatWithSpendingOutput, type TransactionForChat } from '@/ai/flows/chat-with-spending-flow';
import { CATEGORIES, MONTH_NAMES, FAMILY_MEMBERS, FAMILY_ACCOUNT_ID } from '@/lib/constants';
import type { Transaction } from '@/types';

const FALLBACK_HOST_CHATBOT = 'localhost';
const FALLBACK_PORT_CHATBOT = '3000'; // << CHANGED TO 3000 based on user's Linux host info

// Helper to fetch transactions for a given monthYear and familyId
async function fetchTransactionsForMonth(familyId: string, monthYear: string): Promise<Transaction[]> {
  if (!familyId || familyId === 'undefined') {
    console.error('[ChatbotActions fetchTransactionsForMonth] familyId is invalid. Aborting fetch.');
    return [];
  }
  if (!monthYear) {
      console.error('[ChatbotActions fetchTransactionsForMonth] monthYear is undefined. Aborting fetch.');
      return [];
  }

  const relativePath = `/api/transactions?userId=${encodeURIComponent(familyId)}&monthYear=${encodeURIComponent(monthYear)}`;
  let requestUrlString: string;

  const appBaseUrlFromEnv = process.env.NEXT_PUBLIC_APP_URL;

  if (appBaseUrlFromEnv) {
      try {
          const baseUrlObj = new URL(appBaseUrlFromEnv); // Validate if it's a proper base
          requestUrlString = new URL(relativePath, baseUrlObj).toString();
          console.log(`[ChatbotActions fetchTransactionsForMonth] Using NEXT_PUBLIC_APP_URL as base: ${appBaseUrlFromEnv}. Full URL: ${requestUrlString}`);
      } catch (e: any) {
          console.error(`[ChatbotActions fetchTransactionsForMonth] Invalid NEXT_PUBLIC_APP_URL: ${appBaseUrlFromEnv}. Falling back. Error: ${e.message}`);
          requestUrlString = `http://${FALLBACK_HOST_CHATBOT}:${FALLBACK_PORT_CHATBOT}${relativePath}`;
          console.log(`[ChatbotActions fetchTransactionsForMonth] NEXT_PUBLIC_APP_URL invalid, using fallback http://${FALLBACK_HOST_CHATBOT}:${FALLBACK_PORT_CHATBOT}. Full URL: ${requestUrlString}`);
      }
  } else {
      requestUrlString = `http://${FALLBACK_HOST_CHATBOT}:${FALLBACK_PORT_CHATBOT}${relativePath}`;
      console.log(`[ChatbotActions fetchTransactionsForMonth] NEXT_PUBLIC_APP_URL not set, using fallback http://${FALLBACK_HOST_CHATBOT}:${FALLBACK_PORT_CHATBOT}. Full URL: ${requestUrlString}`);
  }
  
  console.log(`[ChatbotActions fetchTransactionsForMonth] Final URL for fetch: "${requestUrlString}"`);

  try {
    const response = await fetch(requestUrlString, { cache: 'no-store' });

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
        `[ChatbotActions fetchTransactionsForMonth] Error response from API (status: ${response.status}, statusText: ${response.statusText}) when fetching from ${requestUrlString}. Parsed JSON:`,
        errorData,
        responseBodyText ? `Raw Body: "${responseBodyText}"` : "Raw body could not be read."
      );
      
      let finalErrorMessage = `Không thể tải giao dịch từ server (${response.status}).`;
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
    console.log(`[ChatbotActions fetchTransactionsForMonth] Fetched ${transactions.length} transactions for ${monthYear} from ${requestUrlString}.`);
    return transactions;
  } catch (error: any) {
    console.error(`[ChatbotActions fetchTransactionsForMonth] Fetch to "${requestUrlString}" FAILED. Error Name: ${error.name}, Message: ${error.message}, Cause:`, error.cause);
    throw new Error(error.message || `Lỗi khi gọi API giao dịch cho ${monthYear}.`);
  }
}

export async function askSpendingChatbot(userQuestion: string): Promise<ChatWithSpendingOutput | { error: string }> {
  console.log(`[ChatbotActions] askSpendingChatbot called with question: "${userQuestion}"`);
  try {
    const familyId = FAMILY_ACCOUNT_ID; 
    
    if (!familyId || familyId === 'undefined') {
        const criticalErrorMsg = `[ChatbotActions askSpendingChatbot] CRITICAL: familyId is invalid: ${familyId}. Check constants.ts or import.`;
        console.error(criticalErrorMsg);
        return { error: "Lỗi cấu hình hệ thống: ID gia đình không hợp lệ." };
    }
    console.log(`[ChatbotActions] Using familyId: ${familyId}`);

    const currentDate = new Date(); 
    const currentMonthYear = format(currentDate, 'yyyy-MM'); 
    
    const currentMonthIndex = currentDate.getMonth(); 
    const currentYear = currentDate.getFullYear(); 
    const currentMonthLabel = `${MONTH_NAMES[currentMonthIndex]} ${currentYear}`; 

    console.log(`[ChatbotActions] Server current date: ${currentDate.toISOString()}`);
    console.log(`[ChatbotActions] Determined monthYear for query: ${currentMonthYear}`);
    console.log(`[ChatbotActions] Determined currentMonthLabel for AI: ${currentMonthLabel}`);

    let rawTransactions: Transaction[];
    try {
        rawTransactions = await fetchTransactionsForMonth(familyId, currentMonthYear);
    } catch (fetchError: any) {
        console.error(`[ChatbotActions askSpendingChatbot] Failed to fetch transactions for ${currentMonthYear}:`, fetchError.message);
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
    console.error("[ChatbotActions] Error in askSpendingChatbot server action:", error.message, error.stack, error.cause);
    return { error: error.message || "Đã có lỗi xảy ra khi trò chuyện với AI." };
  }
}
