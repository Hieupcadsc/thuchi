
'use server';
/**
 * @fileOverview A Genkit flow for extracting information from a bill/receipt image.
 *
 * - extractBillInfo - A function that takes a bill image and returns extracted information.
 * - ExtractBillInfoInput - The input type for the extractBillInfo function.
 * - ExtractBillInfoOutput - The return type for the extractBillInfo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractBillInfoInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a bill or receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractBillInfoInput = z.infer<typeof ExtractBillInfoInputSchema>;

const ExtractBillInfoOutputSchema = z.object({
  totalAmount: z.number().optional().describe('The final total amount paid on the bill.'),
  transactionDate: z.string().optional().describe('The date of the transaction, ideally in YYYY-MM-DD format, or as seen on the bill.'),
  description: z.string().optional().describe('A brief description of the purchase, often the store name or a summary.'),
});
export type ExtractBillInfoOutput = z.infer<typeof ExtractBillInfoOutputSchema>;

export async function extractBillInfo(input: ExtractBillInfoInput): Promise<ExtractBillInfoOutput> {
  return extractBillInfoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractBillInfoPrompt',
  model: 'googleai/gemini-1.5-flash-latest', // Vision capable model
  input: {schema: ExtractBillInfoInputSchema},
  output: {schema: ExtractBillInfoOutputSchema},
  prompt: `You are an AI assistant specialized in extracting information from receipts and bills.
Analyze the provided image of a bill.

Instructions:
1.  Extract the TOTAL AMOUNT PAID. This is usually labeled as "Total", "Grand Total", "Thành tiền", "Tổng cộng", etc. If there are multiple totals (e.g., subtotal, total with tax), use the final amount the customer actually paid.
2.  Extract the TRANSACTION DATE. Try to identify the date the transaction occurred. If possible, format it as YYYY-MM-DD. If not, return the date string as you see it on the bill.
3.  Extract a brief DESCRIPTION of the purchase. This is often the store name, restaurant name, or a general summary if the store name is not clear.

If any piece of information is unclear, ambiguous, or not present on the bill, please omit that field or set its value to null in the JSON output. Focus on accuracy.

Bill Image:
{{media url=photoDataUri}}

Return the information in the specified JSON format.
`,
});

const extractBillInfoFlow = ai.defineFlow(
  {
    name: 'extractBillInfoFlow',
    inputSchema: ExtractBillInfoInputSchema,
    outputSchema: ExtractBillInfoOutputSchema,
  },
  async (input) => {
    const {output, usage} = await prompt(input);
    console.log('[extractBillInfoFlow] AI Usage:', usage);
    if (!output) {
        console.warn('[extractBillInfoFlow] AI did not return any output.');
        return {}; // Return empty object if AI gives no output
    }
    console.log('[extractBillInfoFlow] AI Output:', output);
    return output;
  }
);
