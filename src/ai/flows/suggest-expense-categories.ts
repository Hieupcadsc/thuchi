// This file is machine-generated - do not edit!

'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting expense categories based on a user's description.
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
});
export type SuggestExpenseCategoriesInput = z.infer<
  typeof SuggestExpenseCategoriesInputSchema
>;

const SuggestExpenseCategoriesOutputSchema = z.object({
  suggestedCategories: z
    .array(z.string())
    .describe('A list of suggested expense categories.'),
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
  prompt: `You are a personal finance assistant. Given the following expense description, suggest a list of relevant expense categories.

Description: {{{expenseDescription}}}

Categories:`,
});

const suggestExpenseCategoriesFlow = ai.defineFlow(
  {
    name: 'suggestExpenseCategoriesFlow',
    inputSchema: SuggestExpenseCategoriesInputSchema,
    outputSchema: SuggestExpenseCategoriesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
