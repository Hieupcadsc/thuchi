import { gemini15Flash } from '@genkit-ai/googleai';
import { z } from 'zod';
import { ai } from '../genkit';

export const SuggestCategoriesInputSchema = z.object({
  description: z.string(),
  type: z.enum(['income', 'expense']),
});

export const SuggestCategoriesOutputSchema = z.object({
  suggestedCategoryId: z.string(),
  confidence: z.number(),
});

export type SuggestCategoriesInput = z.infer<typeof SuggestCategoriesInputSchema>;
export type SuggestCategoriesOutput = z.infer<typeof SuggestCategoriesOutputSchema>;

export const suggestExpenseCategories = ai.defineFlow(
  {
    name: 'suggestExpenseCategories',
    inputSchema: SuggestCategoriesInputSchema,
    outputSchema: SuggestCategoriesOutputSchema,
  },
  async (input: SuggestCategoriesInput): Promise<SuggestCategoriesOutput> => {
    const categories = {
      income: [
        { id: 'thu_nhap_luong', name: 'Lương' },
        { id: 'thu_nhap_thuong', name: 'Thưởng' },
        { id: 'thu_nhap_khac', name: 'Thu nhập khác' },
      ],
      expense: [
        { id: 'an_uong', name: 'Ăn uống' },
        { id: 'di_chuyen', name: 'Di chuyển' },
        { id: 'mua_sam', name: 'Mua sắm' },
        { id: 'giai_tri', name: 'Giải trí' },
        { id: 'hoa_don', name: 'Hóa đơn' },
        { id: 'suc_khoe', name: 'Sức khỏe' },
        { id: 'giao_duc', name: 'Giáo dục' },
        { id: 'nha_cua', name: 'Nhà cửa' },
        { id: 'chi_phi_khac', name: 'Chi phí khác' },
      ],
    };

    const prompt = `
Bạn là AI chuyên gia phân loại giao dịch tài chính gia đình Việt Nam với khả năng hiểu ngữ cảnh sâu.

NHIỆM VỤ: Phân tích mô tả "${input.description}" (${input.type === 'expense' ? 'Chi tiêu' : 'Thu nhập'}) và chọn danh mục phù hợp nhất.

DANH SÁCH DANH MỤC:
${JSON.stringify(categories[input.type], null, 2)}

QUY TẮC PHÂN LOẠI THÔNG MINH:

🍽️ AN_UONG: ăn, uống, cơm, sáng/trưa/tối, quán, nhà hàng, buffet, food, coffee, cafe, nước, đồ ăn, bữa
🚗 DI_CHUYEN: xe, taxi, uber, grab, bus, xăng, gas, vé tàu, máy bay, đi lại, di chuyển, ship, giao hàng
🛍️ MUA_SAM: mua, shopping, quần áo, giày, túi, đồ dùng, phụ kiện, cosmetic, làm đẹp
🎬 GIAI_TRI: phim, game, du lịch, massage, spa, vui chơi, party, bar, club, concert, sách giải trí
💡 HOA_DON: điện, nước, internet, wifi, điện thoại, cable, gas, utilities, bill, cước
🏥 SUC_KHOE: bác sĩ, thuốc, khám, hospital, nha khoa, xét nghiệm, vaccine, y tế
📚 GIAO_DUC: học, course, sách, trường, university, khoá học, training, certification
🏠 NHA_CUA: thuê nhà, sửa chữa, đồ gia dụng, nội thất, home improvement, utilities cho nhà

NGUYÊN TẮC:
- Ưu tiên phân tích NGỮ CẢNH và MỤC ĐÍCH thay vì chỉ keyword
- Confidence cao (0.8-0.95) nếu chắc chắn, thấp (0.4-0.7) nếu mơ hồ
- CHỈ dùng "chi_phi_khac" khi THỰC SỰ không thuộc danh mục nào (confidence < 0.5)

VÍ DỤ PHÂN TÍCH:
- "ăn tối cùng trai" → an_uong (0.9) - rõ ràng là hoạt động ăn uống
- "mua đồ ăn" → mua_sam (0.8) - mua sắm thực phẩm 
- "đi xem phim" → giai_tri (0.9) - giải trí rõ ràng

Trả về CHÍNH XÁC format JSON này (KHÔNG dùng markdown):
{"suggestedCategoryId": "category_id", "confidence": 0.85}

CHỈ JSON thuần, KHÔNG có code blocks hoặc text nào khác!
`;

    try {
      const response = await ai.generate({
        model: gemini15Flash,
        prompt: prompt,
      });

      let result = response.text;
      
      // Remove markdown code blocks if present
      result = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      console.log('🤖 [GEMINI] Raw response:', result);
      
      const parsed = JSON.parse(result);
      
      return {
        suggestedCategoryId: parsed.suggestedCategoryId || 'chi_phi_khac',
        confidence: parsed.confidence || 0.5,
      };
    } catch (error) {
      console.error('Error in suggestExpenseCategories:', error);
      return {
        suggestedCategoryId: input.type === 'income' ? 'thu_nhap_khac' : 'chi_phi_khac',
        confidence: 0.1,
      };
    }
  }
); 