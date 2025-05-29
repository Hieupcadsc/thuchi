
'use server';
/**
 * @fileOverview A Genkit flow for a chatbot that answers questions about family spending.
 *
 * - chatWithSpending - A function that takes a user question and transaction data to provide an answer.
 * - ChatWithSpendingInput - The input type for the chatWithSpending function.
 * - ChatWithSpendingOutput - The return type for the chatWithSpending function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { FamilyMember } from '@/types';

// Schema for transactions relevant to the chatbot
const TransactionForChatSchema = z.object({
  description: z.string().describe('Brief description of the transaction.'),
  amount: z.number().describe('The monetary value of the transaction.'),
  type: z.enum(['income', 'expense']).describe('Type of transaction: income or expense.'),
  categoryName: z.string().describe('The name of the category this transaction belongs to.'),
  date: z.string().describe('Date of the transaction in YYYY-MM-DD format.'),
  performedBy: z.custom<FamilyMember>().describe('The family member who performed the transaction (e.g., Minh Đan, Minh Hiếu).'),
});
export type TransactionForChat = z.infer<typeof TransactionForChatSchema>;

// Input schema for the chatbot flow
const ChatWithSpendingInputSchema = z.object({
  userQuestion: z.string().describe("The user's question about their spending."),
  transactions: z.array(TransactionForChatSchema).describe('A list of transactions for the current context (e.g., current month).'),
  currentMonthLabel: z.string().describe('Label for the current month (e.g., "Tháng 7 2024").'),
  familyName: z.string().default("gia đình").describe("The name of the family, e.g., 'gia đình bạn', 'gia đình Minh Đan và Minh Hiếu'.")
});
export type ChatWithSpendingInput = z.infer<typeof ChatWithSpendingInputSchema>;

// Output schema for the chatbot flow
const ChatWithSpendingOutputSchema = z.object({
  answer: z.string().describe("The chatbot's answer to the user's question, in Vietnamese."),
});
export type ChatWithSpendingOutput = z.infer<typeof ChatWithSpendingOutputSchema>;

export async function chatWithSpending(input: ChatWithSpendingInput): Promise<ChatWithSpendingOutput> {
  return chatWithSpendingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'chatWithSpendingPrompt',
  input: {schema: ChatWithSpendingInputSchema},
  output: {schema: ChatWithSpendingOutputSchema},
  prompt: `Bạn là một trợ lý tài chính cá nhân.
Nhiệm vụ CỐ ĐỊNH và DUY NHẤT của bạn là trả lời câu hỏi của người dùng về chi tiêu của {{{familyName}}} *CHỈ DỰA TRÊN DỮ LIỆU GIAO DỊCH ĐƯỢC CUNG CẤP CHO THÁNG {{{currentMonthLabel}}}*.
TUYỆT ĐỐI KHÔNG ĐƯỢC ĐỀ CẬP ĐẾN HOẶC SUY DIỄN VỀ BẤT KỲ THÁNG NÀO KHÁC NGOÀI {{{currentMonthLabel}}}.
Nếu người dùng hỏi về một tháng khác không phải là tháng {{{currentMonthLabel}}}, hãy lịch sự thông báo rằng bạn chỉ có dữ liệu cho tháng {{{currentMonthLabel}}} và không thể cung cấp thông tin cho tháng họ hỏi.

Câu hỏi của người dùng: "{{userQuestion}}"

Dữ liệu giao dịch của {{{familyName}}} trong tháng {{{currentMonthLabel}}}:
{{#if transactions.length}}
  {{#each transactions}}
    - Ngày: {{date}}, Thực hiện bởi: {{performedBy}}, Danh mục: {{categoryName}}, Loại: {{type}}, Số tiền: {{amount}} VND, Mô tả: "{{description}}"
  {{/each}}
{{else}}
  Không có giao dịch nào trong tháng {{{currentMonthLabel}}}.
{{/if}}

Hãy phân tích kỹ các giao dịch trên để trả lời câu hỏi.
Nếu thông tin không có trong danh sách giao dịch cho tháng {{{currentMonthLabel}}}, hãy trả lời một cách lịch sự rằng bạn không tìm thấy thông tin đó trong dữ liệu của tháng {{{currentMonthLabel}}}.
Trả lời bằng tiếng Việt.
`,
});

const chatWithSpendingFlow = ai.defineFlow(
  {
    name: 'chatWithSpendingFlow',
    inputSchema: ChatWithSpendingInputSchema,
    outputSchema: ChatWithSpendingOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("AI chat did not return any output.");
    }
    return output;
  }
);
