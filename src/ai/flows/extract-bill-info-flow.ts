import { gemini15Flash } from '@genkit-ai/googleai';
import { z } from 'zod';
import { ai } from '../genkit';

export const ExtractBillInfoInputSchema = z.object({
  imageDataUri: z.string(),
});

export const ExtractBillInfoOutputSchema = z.object({
  totalAmount: z.number().optional(),
  transactionDate: z.string().optional(),
  description: z.string().optional(),
  note: z.string().optional(),
});

export type ExtractBillInfoInput = z.infer<typeof ExtractBillInfoInputSchema>;
export type ExtractBillInfoOutput = z.infer<typeof ExtractBillInfoOutputSchema>;

export const extractBillInfo = ai.defineFlow(
  {
    name: 'extractBillInfo',
    inputSchema: ExtractBillInfoInputSchema,
    outputSchema: ExtractBillInfoOutputSchema,
  },
  async (input: ExtractBillInfoInput): Promise<ExtractBillInfoOutput> => {
    const prompt = `
Bạn là một AI chuyên phân tích hóa đơn/bill Việt Nam. Hãy phân tích hình ảnh này và trích xuất thông tin sau:

1. Tổng số tiền (totalAmount) - chỉ trả về số, không có ký tự đặc biệt
2. Ngày giao dịch (transactionDate) - định dạng YYYY-MM-DD
3. Mô tả/tên cửa hàng (description) - tên cửa hàng hoặc loại giao dịch
4. Chi tiết các món (note) - liệt kê tất cả các món/item trong bill

Lưu ý:
- Nếu không tìm thấy thông tin nào, trả về undefined cho field đó
- Số tiền là số cuối cùng, thường là tổng cộng
- Ngày có thể ở nhiều định dạng khác nhau (dd/mm/yyyy, dd-mm-yyyy, etc.)
- Mô tả nên ngắn gọn và có ý nghĩa
- Note: liệt kê chi tiết các món với giá, ví dụ: "Cà ngã gha rang muối 39k, Ốc lái háp thái 15k, Nghêu Bắc háp xả 15k..."

QUAN TRỌNG: Chỉ trả về JSON object thuần túy, KHÔNG sử dụng markdown code blocks hoặc text khác. Ví dụ:
{"totalAmount": 248000, "transactionDate": "2025-01-21", "description": "Nhà hàng hải sản", "note": "Cà ngã gha rang muối 39k, Ốc lái háp thái 15k, Nghêu Bắc háp xả 15k, Mì xào bạch tuộc 30k..."}
`;

    try {
      const response = await ai.generate({
        model: gemini15Flash,
        prompt: [
          {
            text: prompt,
          },
          {
            media: {
              url: input.imageDataUri,
            },
          },
        ],
      });

      let result = response.text.trim();
      console.log('AI Response:', result);

      // Remove markdown code blocks if present
      if (result.startsWith('```json') && result.endsWith('```')) {
        result = result.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (result.startsWith('```') && result.endsWith('```')) {
        result = result.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Parse JSON response
      const parsed = JSON.parse(result);
      
      return {
        totalAmount: parsed.totalAmount,
        transactionDate: parsed.transactionDate,
        description: parsed.description,
        note: parsed.note,
      };
    } catch (error) {
      console.error('Error in extractBillInfo:', error);
      return {};
    }
  }
); 