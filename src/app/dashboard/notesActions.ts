
'use server';

import type { FamilyMember } from '@/types';

interface SharedNoteData {
  note: string;
  modifiedBy?: FamilyMember;
  modifiedAt?: string; // ISO date string
}

interface SaveNoteResult {
  success: boolean;
  data?: SharedNoteData;
  error?: string;
}

// Smart fallback detection for different environments
const getSmartFallbackUrl = () => {
  // In browser context, use current origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Server-side fallback - detect environment
  const isReplit = process.env.REPL_SLUG || process.env.REPLIT_DB_URL;
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isReplit) {
    // Replit environment - use port 3000
    return 'http://localhost:3000';
  }
  
  // Local development - use port 9002
  return 'http://localhost:9002';
};

export async function getSharedNote(familyId: string = 'GIA_DINH'): Promise<SharedNoteData | { error: string }> {
  const endpoint = `/api/shared-notes?familyId=${encodeURIComponent(familyId)}`;
  let absoluteApiUrl: string;

  const appBaseUrlFromEnv = process.env.NEXT_PUBLIC_APP_URL;

  if (appBaseUrlFromEnv) {
      try {
          const base = new URL(appBaseUrlFromEnv); // Validate if it's a proper base
          absoluteApiUrl = new URL(endpoint, base).toString();
          console.log(`[notesActions getSharedNote] Using NEXT_PUBLIC_APP_URL as base: ${appBaseUrlFromEnv}. Full URL: ${absoluteApiUrl}`);
      } catch (e: any) {
          const criticalErrorMsg = `[notesActions getSharedNote] CRITICAL: Invalid NEXT_PUBLIC_APP_URL: ${appBaseUrlFromEnv}. Falling back. Error: ${e.message}.`;
          console.error(criticalErrorMsg);
          const fallbackUrl = getSmartFallbackUrl();
          absoluteApiUrl = `${fallbackUrl}${endpoint}`;
          console.log(`[notesActions getSharedNote] NEXT_PUBLIC_APP_URL invalid, using fallback ${fallbackUrl}. Full URL: ${absoluteApiUrl}`);
      }
  } else {
      const fallbackUrl = getSmartFallbackUrl();
      absoluteApiUrl = `${fallbackUrl}${endpoint}`;
      console.log(`[notesActions getSharedNote] NEXT_PUBLIC_APP_URL not set, using fallback ${fallbackUrl}. Full URL: ${absoluteApiUrl}`);
  }
  
  console.log(`[notesActions getSharedNote] Attempting to fetch from: ${absoluteApiUrl}`);

  try {
    const response = await fetch(absoluteApiUrl, { cache: 'no-store' });

    if (!response.ok) {
      let errorData: any = {};
      let responseBodyText = '';
      try {
        responseBodyText = await response.text();
        if (response.headers.get('content-type')?.includes('application/json')) {
            errorData = JSON.parse(responseBodyText);
        } else {
          console.warn(`[notesActions getSharedNote] API error response (status: ${response.status}) was not JSON. Raw text:`, responseBodyText);
        }
      } catch (parseError: any) { 
        console.warn(`[notesActions getSharedNote] Could not parse API error response (status: ${response.status}) as JSON. Raw text: "${responseBodyText}". Parse error:`, parseError.message);
      }
      const errorMessage = errorData.message || responseBodyText || `Không thể tải ghi chú chung (mã lỗi: ${response.status}).`;
      console.error(`[notesActions getSharedNote] API Error ${response.status} from ${absoluteApiUrl}:`, errorMessage, `Raw Body Text (if any): ${responseBodyText}`, `Original error cause:`, (errorData as any)?.cause || 'N/A');
      return { error: errorMessage };
    }
    
    const data = await response.json();
    console.log('[notesActions getSharedNote] Fetched data successfully from API.');
    // Transform Firestore response to expected format
    return {
      note: data.content || '',
      modifiedBy: data.modifiedBy,
      modifiedAt: data.modifiedAt
    };
  } catch (error: any) {
    const errorMessage = error.message || 'Lỗi không xác định khi fetch.';
    const errorCauseString = error.cause ? `Nguyên nhân: ${JSON.stringify(error.cause)}` : '';
    console.error(`[notesActions getSharedNote] Network or fetch exception for URL ${absoluteApiUrl}:`, errorMessage, error.stack, errorCauseString);
    return { error: `Lỗi kết nối khi tải ghi chú: ${errorMessage}. Hãy đảm bảo server API đang chạy và có thể truy cập tại ${absoluteApiUrl}. ${errorCauseString}` };
  }
}

export async function saveSharedNote(noteContent: string, performingUser: FamilyMember, familyId: string = 'GIA_DINH'): Promise<SaveNoteResult> {
  if (typeof noteContent !== 'string') {
    return { success: false, error: 'Nội dung ghi chú không hợp lệ.' };
  }
  if (!performingUser) {
    return { success: false, error: 'Không xác định được người dùng.' };
  }

  const endpoint = '/api/shared-notes';
  let absoluteApiUrl: string;
  const appBaseUrlFromEnv = process.env.NEXT_PUBLIC_APP_URL;

  if (appBaseUrlFromEnv) {
    try {
        const base = new URL(appBaseUrlFromEnv);
        absoluteApiUrl = new URL(endpoint, base).toString();
        console.log(`[notesActions saveSharedNote] Using NEXT_PUBLIC_APP_URL as base: ${appBaseUrlFromEnv}. Full URL: ${absoluteApiUrl}`);
    } catch (e: any) {
        console.error(`[notesActions saveSharedNote] CRITICAL: Invalid NEXT_PUBLIC_APP_URL: ${appBaseUrlFromEnv}. Falling back. Error: ${e.message}.`);
        const fallbackUrl = getSmartFallbackUrl();
        absoluteApiUrl = `${fallbackUrl}${endpoint}`;
        console.log(`[notesActions saveSharedNote] NEXT_PUBLIC_APP_URL invalid, using fallback ${fallbackUrl}. Full URL: ${absoluteApiUrl}`);
    }
  } else {
      const fallbackUrl = getSmartFallbackUrl();
      absoluteApiUrl = `${fallbackUrl}${endpoint}`;
      console.log(`[notesActions saveSharedNote] NEXT_PUBLIC_APP_URL not set, using fallback ${fallbackUrl}. Full URL: ${absoluteApiUrl}`);
  }

  console.log(`[notesActions saveSharedNote] Attempting to post to: ${absoluteApiUrl}`);

  try {
    const response = await fetch(absoluteApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ familyId: familyId, content: noteContent, modifiedBy: performingUser }),
    });

    if (!response.ok) {
      let errorData: any = {};
      let responseBodyText = '';
      try {
        responseBodyText = await response.text();
        if (response.headers.get('content-type')?.includes('application/json')) {
            errorData = JSON.parse(responseBodyText);
        } else {
           console.warn(`[notesActions saveSharedNote] API error response (status: ${response.status}) was not JSON. Raw text:`, responseBodyText);
        }
      } catch (parseError: any) { 
         console.warn(`[notesActions saveSharedNote] Could not parse API error response (status: ${response.status}) as JSON. Raw text: "${responseBodyText}". Parse error:`, parseError.message);
      }
      const errorMessage = errorData.message || responseBodyText || `Không thể lưu ghi chú chung (mã lỗi: ${response.status}).`;
      console.error(`[notesActions saveSharedNote] API Error ${response.status} from ${absoluteApiUrl}:`, errorMessage, `Raw Body Text (if any): ${responseBodyText}`, `Original error cause:`, (errorData as any)?.cause || 'N/A');
      return { success: false, error: errorMessage };
    }
    
    const result = await response.json();
    if (result.success) {
        console.log('[notesActions saveSharedNote] Saved data successfully via API.');
        return { 
          success: true, 
          data: { 
            note: noteContent, // Use the content we sent
            modifiedBy: performingUser, 
            modifiedAt: new Date().toISOString()
          } 
        };
    } else {
        // This case might not be hit if API returns non-ok status, but as a fallback
        const errorMessage = result.message || 'Lưu ghi chú không thành công từ API.';
        console.error('[notesActions saveSharedNote] API reported not successful (but HTTP OK):', result);
        return { success: false, error: errorMessage };
    }
  } catch (error: any) {
    const errorMessage = error.message || 'Lỗi không xác định khi fetch.';
    const errorCauseString = error.cause ? `Nguyên nhân: ${JSON.stringify(error.cause)}` : '';
    console.error(`[notesActions saveSharedNote] Network or fetch exception for URL ${absoluteApiUrl}:`, errorMessage, error.stack, errorCauseString);
    return { success: false, error: `Lỗi kết nối khi lưu ghi chú: ${errorMessage}. Hãy đảm bảo server API đang chạy và có thể truy cập tại ${absoluteApiUrl}. ${errorCauseString}` };
  }
}
