'use server';
/**
 * @fileOverview A Genkit flow to analyze family spending patterns and provide financial insights.
 *
 * - analyzeFamilySpending - A function that analyzes transactions and returns insights and tips.
 * - AnalyzeSpendingInput - The input type for the analyzeFamilySpending function.
 * - AnalyzeSpendingOutput - The return type for the analyzeFamilySpending function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { FamilyMember } from '@/types'; // Assuming FamilyMember is 'Minh Đan' | 'Minh Hiếu'

// Define a schema for transactions relevant to the AI analysis
const TransactionForAnalysisSchema = z.object({
  description: z.string().describe('Brief description of the transaction.'),
  amount: z.number().describe('The monetary value of the transaction.'),
  type: z.enum(['income', 'expense']).describe('Type of transaction: income or expense.'),
  categoryName: z.string().describe('The name of the category this transaction belongs to.'),
  date: z.string().describe('Date of the transaction in YYYY-MM-DD format.'),
  performedBy: z.custom<FamilyMember>().describe('The family member who performed the transaction (e.g., Minh Đan, Minh Hiếu).'),
});
export type TransactionForAnalysis = z.infer<typeof TransactionForAnalysisSchema>;

// Define the input schema for the flow
const AnalyzeSpendingInputSchema = z.object({
  currentMonthTransactions: z.array(TransactionForAnalysisSchema).describe('Transactions for the current month.'),
  previousMonthTransactions: z.array(TransactionForAnalysisSchema).describe('Transactions for the previous month. Can be empty if no data for previous month.'),
  allCategories: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['income', 'expense']),
  })).describe('List of all available categories for context.'),
  currentMonthLabel: z.string().describe('Label for the current month (e.g., "Tháng 7 2024").'),
  previousMonthLabel: z.string().describe('Label for the previous month (e.g., "Tháng 6 2024").'),
  familyName: z.string().default("gia đình").describe("The name of the family, e.g., 'gia đình bạn', 'gia đình Minh Đan và Minh Hiếu'.")
});
export type AnalyzeSpendingInput = z.infer<typeof AnalyzeSpendingInputSchema>;

// Define the output schema for the flow
const AnalyzeSpendingOutputSchema = z.object({
  overallSummary: z.string().describe("Một bản tóm tắt tổng quan ngắn gọn (2-3 câu) về tình hình tài chính của gia đình trong tháng này so với tháng trước, bằng tiếng Việt."),
  categoryInsights: z.array(z.object({
    categoryName: z.string().describe("Tên danh mục chi tiêu/thu nhập."),
    currentMonthTotal: z.number().describe("Tổng số tiền cho danh mục này trong tháng hiện tại."),
    previousMonthTotal: z.number().optional().describe("Tổng số tiền cho danh mục này trong tháng trước (nếu có)."),
    changeDescription: z.string().optional().describe("Mô tả sự thay đổi so với tháng trước (ví dụ: 'tăng 20%', 'giảm 50.000 VND', 'không thay đổi đáng kể'), bằng tiếng Việt."),
    insight: z.string().describe("Một nhận xét ngắn gọn (1-2 câu) về chi tiêu/thu nhập trong danh mục này, bằng tiếng Việt.")
  })).describe("Thông tin chi tiết cho các danh mục chi tiêu/thu nhập quan trọng, đặc biệt là những danh mục có thay đổi đáng kể hoặc chiếm tỷ trọng lớn."),
  financialTips: z.array(z.string()).describe("Các mẹo tài chính hữu ích và có thể thực hiện được (2-3 mẹo) dựa trên phân tích, bằng tiếng Việt. Các mẹo nên cụ thể và liên quan đến dữ liệu đã phân tích.")
});
export type AnalyzeSpendingOutput = z.infer<typeof AnalyzeSpendingOutputSchema>;

// Exported function to be called by server actions
export async function analyzeFamilySpending(input: AnalyzeSpendingInput): Promise<AnalyzeSpendingOutput> {
  return analyzeSpendingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeSpendingPrompt',
  input: {schema: AnalyzeSpendingInputSchema},
  output: {schema: AnalyzeSpendingOutputSchema},
  prompt: `Bạn là một chuyên gia tư vấn tài chính cá nhân, chuyên giúp các gia đình Việt Nam quản lý chi tiêu hiệu quả.
Nhiệm vụ của bạn là phân tích dữ liệu giao dịch được cung cấp cho {{{currentMonthLabel}}} và {{{previousMonthLabel}}} của {{{familyName}}}.

Dựa trên dữ liệu giao dịch của hai tháng này:
1.  **Tóm tắt tổng quan:** Viết một bản tóm tắt ngắn gọn (2-3 câu) về tình hình tài chính chung của {{{familyName}}} trong {{{currentMonthLabel}}} so với {{{previousMonthLabel}}}. Ví dụ: "Nhìn chung, {{{familyName}}} đã chi tiêu nhiều hơn/ít hơn trong tháng này..."
2.  **Phân tích theo danh mục:**
    *   Xác định các danh mục chi tiêu/thu nhập chính.
    *   So sánh tổng chi tiêu/thu nhập trong mỗi danh mục quan trọng giữa {{{currentMonthLabel}}} và {{{previousMonthLabel}}}. Tính toán sự thay đổi (ví dụ: phần trăm tăng/giảm, số tiền chênh lệch).
    *   Đưa ra nhận xét ngắn gọn về những thay đổi đáng chú ý hoặc các danh mục chiếm tỷ trọng lớn.
3.  **Đưa ra mẹo tài chính:**
    *   Đề xuất 2-3 mẹo tài chính cụ thể, hữu ích và có thể thực hiện được bằng tiếng Việt, dựa trên những phân tích ở trên. Các mẹo nên giúp {{{familyName}}} cải thiện tình hình tài chính, tiết kiệm hơn hoặc chi tiêu thông minh hơn.

Hãy trình bày kết quả phân tích của bạn một cách rõ ràng, dễ hiểu, và tập trung vào những thông tin quan trọng nhất. Sử dụng ngôn ngữ thân thiện, chuyên nghiệp.

**Dữ liệu giao dịch tháng hiện tại ({{{currentMonthLabel}}}):**
{{#if currentMonthTransactions.length}}
  {{#each currentMonthTransactions}}
    - Ngày: {{date}}, Thực hiện bởi: {{performedBy}}, Danh mục: {{categoryName}}, Loại: {{type}}, Số tiền: {{amount}}, Mô tả: {{description}}
  {{/each}}
{{else}}
  Không có giao dịch nào trong tháng hiện tại.
{{/if}}

**Dữ liệu giao dịch tháng trước ({{{previousMonthLabel}}}):**
{{#if previousMonthTransactions.length}}
  {{#each previousMonthTransactions}}
    - Ngày: {{date}}, Thực hiện bởi: {{performedBy}}, Danh mục: {{categoryName}}, Loại: {{type}}, Số tiền: {{amount}}, Mô tả: {{description}}
  {{/each}}
{{else}}
  Không có dữ liệu giao dịch cho tháng trước.
{{/if}}

**Tất cả các danh mục có thể có:**
{{#each allCategories}}
  - ID: {{id}}, Tên: {{name}}, Loại: {{type}}
{{/each}}

Vui lòng cung cấp kết quả theo đúng cấu trúc JSON đã định nghĩa cho output.
`,
});

const analyzeSpendingFlow = ai.defineFlow(
  {
    name: 'analyzeSpendingFlow',
    inputSchema: AnalyzeSpendingInputSchema,
    outputSchema: AnalyzeSpendingOutputSchema,
  },
  async (input) => {
    // Trong trường hợp không có giao dịch tháng trước, LLM có thể không tính được changeDescription.
    // Điều này là bình thường.
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("AI analysis did not return any output.");
    }
    return output;
  }
);
