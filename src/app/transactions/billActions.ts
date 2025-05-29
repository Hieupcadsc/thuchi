
'use server';

import { extractBillInfo, type ExtractBillInfoInput, type ExtractBillInfoOutput } from '@/ai/flows/extract-bill-info-flow';

interface ProcessBillResult {
  success: boolean;
  data?: ExtractBillInfoOutput;
  error?: string;
}

export async function processBillImage(imageDataUri: string): Promise<ProcessBillResult> {
  if (!imageDataUri) {
    return { success: false, error: 'No image data provided.' };
  }

  console.log('[billActions] Starting bill image processing...');
  try {
    const input: ExtractBillInfoInput = { photoDataUri: imageDataUri };
    const result = await extractBillInfo(input);
    
    if (Object.keys(result).length === 0) {
        console.warn('[billActions] AI returned no usable data from the bill.');
        // It's not an error per se, but AI couldn't extract anything.
        // We can let the client decide how to handle an empty result.
        // For now, treat as success with empty data.
        return { success: true, data: {} };
    }
    
    console.log('[billActions] Bill processing successful, data:', result);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('[billActions] Error processing bill image with AI:', error);
    return { success: false, error: error.message || 'Failed to process bill image with AI.' };
  }
}
