
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

// Determine the base URL for API calls.
// Prioritize NEXT_PUBLIC_APP_URL (useful for deployed environments).
// Fallback to localhost with the specific port 9002 if not set (matching package.json).
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; // Default to 3000 if running on default, or 9002 if you changed it.
                                                                                // For server-to-server calls on Linux, localhost might not resolve correctly.
                                                                                // Consider using 'http://0.0.0.0:PORT' or specific internal IP if issues persist.

export async function getSharedNote(): Promise<SharedNoteData | { error: string }> {
  const endpoint = '/api/shared-notes';
  let absoluteApiUrl: string;

  try {
    // Ensure APP_BASE_URL is a valid base URL.
    const base = new URL(APP_BASE_URL);
    absoluteApiUrl = new URL(endpoint, base).toString();
  } catch (e: any) {
    const criticalErrorMsg = `[notesActions getSharedNote] CRITICAL: Failed to construct URL with base '${APP_BASE_URL}' and endpoint '${endpoint}'. Error: ${e.message}. Check NEXT_PUBLIC_APP_URL or default APP_BASE_URL.`;
    console.error(criticalErrorMsg);
    return { error: `Lỗi cấu hình URL máy chủ: ${e.message}` };
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
      console.error(`[notesActions getSharedNote] API Error ${response.status} from ${absoluteApiUrl}:`, errorMessage, `Raw Body Text (if any): ${responseBodyText}`);
      return { error: errorMessage };
    }
    
    const data: SharedNoteData = await response.json();
    console.log('[notesActions getSharedNote] Fetched data successfully from API.');
    return data;
  } catch (error: any) {
    // This catch block is for network errors (e.g., DNS, connection refused) or if fetch itself fails
    console.error(`[notesActions getSharedNote] Network or fetch exception for URL ${absoluteApiUrl}:`, error.message, error.stack, error.cause);
    return { error: `Lỗi kết nối khi tải ghi chú: ${error.message}. Hãy đảm bảo server API đang chạy và có thể truy cập tại ${absoluteApiUrl}.` };
  }
}

export async function saveSharedNote(noteContent: string, performingUser: FamilyMember): Promise<SaveNoteResult> {
  if (typeof noteContent !== 'string') {
    return { success: false, error: 'Nội dung ghi chú không hợp lệ.' };
  }
  if (!performingUser) {
    return { success: false, error: 'Không xác định được người dùng.' };
  }

  const endpoint = '/api/shared-notes';
  let absoluteApiUrl: string;

  try {
    const base = new URL(APP_BASE_URL);
    absoluteApiUrl = new URL(endpoint, base).toString();
  } catch (e: any) {
    const criticalErrorMsg = `[notesActions saveSharedNote] CRITICAL: Failed to construct URL with base '${APP_BASE_URL}' and endpoint '${endpoint}'. Error: ${e.message}. Check NEXT_PUBLIC_APP_URL or default APP_BASE_URL.`;
    console.error(criticalErrorMsg);
    return { success: false, error: `Lỗi cấu hình URL máy chủ: ${e.message}` };
  }

  console.log(`[notesActions saveSharedNote] Attempting to post to: ${absoluteApiUrl}`);

  try {
    const response = await fetch(absoluteApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: noteContent, modifiedBy: performingUser }),
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
      console.error(`[notesActions saveSharedNote] API Error ${response.status} from ${absoluteApiUrl}:`, errorMessage, `Raw Body Text (if any): ${responseBodyText}`);
      return { success: false, error: errorMessage };
    }
    
    const result: { success: boolean, note: string, modifiedBy: FamilyMember, modifiedAt: string } = await response.json();
    if (result.success) {
        console.log('[notesActions saveSharedNote] Saved data successfully via API.');
        return { success: true, data: { note: result.note, modifiedBy: result.modifiedBy, modifiedAt: result.modifiedAt } };
    } else {
        // This case might not be hit if API returns non-ok status, but as a fallback
        const errorMessage = (result as any).message || 'Lưu ghi chú không thành công từ API.';
        console.error('[notesActions saveSharedNote] API reported not successful (but HTTP OK):', result);
        return { success: false, error: errorMessage };
    }
  } catch (error: any) {
    console.error(`[notesActions saveSharedNote] Network or fetch exception for URL ${absoluteApiUrl}:`, error.message, error.stack, error.cause);
    return { success: false, error: `Lỗi kết nối khi lưu ghi chú: ${error.message}. Hãy đảm bảo server API đang chạy và có thể truy cập tại ${absoluteApiUrl}.` };
  }
}
