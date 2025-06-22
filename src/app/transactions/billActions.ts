'use server';

import { type ExtractBillInfoOutput } from '@/ai/flows/extract-bill-info-flow';

interface ProcessBillResult { 
  success: boolean;
  data?: ExtractBillInfoOutput;
  error?: string;
  warning?: string;
}

export async function processBillImage(imageDataUri: string): Promise<ProcessBillResult> {
  try {
    if (!imageDataUri || !imageDataUri.startsWith('data:image/')) {
      return {
        success: false,
        error: 'Invalid image data provided',
      };
    }

    // Call the API route for consistent processing
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:9002'}/api/ai/process-bill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageDataUri }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || `HTTP error! status: ${response.status}`,
      };
    }

    const result = await response.json();
    
    return {
      success: result.success,
      data: result.data,
      error: result.error,
      warning: result.warning,
    };
  } catch (error: any) {
    console.error('Error processing bill image:', error);
    return {
      success: false,
      error: error.message || 'Failed to process bill image',
    };
  }
} 