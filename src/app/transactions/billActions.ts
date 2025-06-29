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

    // Smart URL detection
    const getApiUrl = () => {
      const envUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
      if (envUrl) return envUrl;
      
      // Auto-detect based on environment
      const port = process.env.PORT || '3000';
      const isProduction = process.env.NODE_ENV === 'production';
      
      if (isProduction || port === '3000') {
        return 'http://localhost:3000';
      }
      
      return 'http://localhost:9002';
    };

    // Call the API route for consistent processing
    const response = await fetch(`${getApiUrl()}/api/ai/process-bill`, {
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