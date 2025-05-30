
'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting expense categories based on a user's description
 * and a list of available categories.
 *
 * - suggestExpenseCategories - A function that takes an expense description and returns a list of suggested categories.
 * - SuggestExpenseCategoriesInput - The input type for the suggestExpenseCategories function.
 * - SuggestExpenseCategoriesOutput - The return type for the suggestExpenseCategories function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestExpenseCategoriesInputSchema = z.object({
  expenseDescription: z
    .string()
    .describe('A description of the expense made by the user.'),
  availableExpenseCategoryNames: z
    .array(z.string())
    .describe('A list of available expense category names for the AI to choose from or be inspired by, in Vietnamese.'),
});
export type SuggestExpenseCategoriesInput = z.infer<
  typeof SuggestExpenseCategoriesInputSchema
>;

const SuggestExpenseCategoriesOutputSchema = z.object({
  suggestedCategories: z
    .array(z.string())
    .describe('A list of suggested expense category names (in Vietnamese) based on the description and available categories.'),
});
export type SuggestExpenseCategoriesOutput = z.infer<
  typeof SuggestExpenseCategoriesOutputSchema
>;

export async function suggestExpenseCategories(
  input: SuggestExpenseCategoriesInput
): Promise<SuggestExpenseCategoriesOutput> {
  return suggestExpenseCategoriesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestExpenseCategoriesPrompt',
  input: {schema: SuggestExpenseCategoriesInputSchema},
  output: {schema: SuggestExpenseCategoriesOutputSchema},
  prompt: `Bạn là một trợ lý tài chính cá nhân hữu ích bằng tiếng Việt.
Nhiệm vụ của bạn là gợi ý các danh mục chi tiêu phù hợp dựa trên mô tả chi tiêu của người dùng.
Bạn PHẢI ưu tiên chọn từ danh sách "Các danh mục chi tiêu tiếng Việt có sẵn" dưới đây.
Nếu mô tả rất chung chung, bạn có thể gợi ý một vài danh mục phù hợp nhất từ danh sách.
Chỉ trả về tên của các danh mục được gợi ý từ danh sách bằng tiếng Việt.

Các danh mục chi tiêu tiếng Việt có sẵn:
{{#each availableExpenseCategoryNames}}
- {{this}}
{{/each}}

Mô tả chi tiêu: "{{expenseDescription}}"

Tên danh mục tiếng Việt được gợi ý (chọn từ danh sách trên):
`,
});

const suggestExpenseCategoriesFlow = ai.defineFlow(
  {
    name: 'suggestExpenseCategoriesFlow',
    inputSchema: SuggestExpenseCategoriesInputSchema,
    outputSchema: SuggestExpenseCategoriesOutputSchema,
  },
  async input => {
    // Ensure a default empty array if AI doesn't provide suggestions
    const {output} = await prompt(input);
    if (!output || !output.suggestedCategories) {
      return { suggestedCategories: [] };
    }
    return output;
  }
);

