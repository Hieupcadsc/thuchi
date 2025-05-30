
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
// Fallback to localhost with the specific port 9002 if not set.
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';

export async function getSharedNote(): Promise<SharedNoteData | { error: string }> {
  const endpoint = '/api/shared-notes';
  let absoluteApiUrl: string;

  try {
    absoluteApiUrl = new URL(endpoint, APP_BASE_URL).toString();
  } catch (e: any) {
    console.error(`[notesActions getSharedNote] CRITICAL: Failed to construct URL with base '${APP_BASE_URL}' and endpoint '${endpoint}'. Error: ${e.message}`);
    return { error: `Lỗi cấu hình URL: ${e.message}` };
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
        }
      } catch (e) { 
        console.warn("[notesActions getSharedNote] API error response was not valid JSON. Raw text:", responseBodyText);
      }
      const errorMessage = errorData.message || responseBodyText || `Không thể tải ghi chú chung (status: ${response.status}).`;
      console.error(`[notesActions getSharedNote] API Error ${response.status} from ${absoluteApiUrl}:`, errorMessage, `Raw Body: ${responseBodyText}`);
      // Return the actual error message from the API if available
      return { error: errorMessage };
    }
    const data: SharedNoteData = await response.json();
    console.log('[notesActions getSharedNote] Fetched data successfully from API.');
    return data;
  } catch (error: any) {
    // This catch block is for network errors or if fetch itself fails before getting a response
    console.error(`[notesActions getSharedNote] Network or fetch exception for URL ${absoluteApiUrl}:`, error.message, error.stack);
    return { error: error.message || 'Lỗi kết nối khi tải ghi chú chung.' };
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
    absoluteApiUrl = new URL(endpoint, APP_BASE_URL).toString();
  } catch (e: any) {
    console.error(`[notesActions saveSharedNote] CRITICAL: Failed to construct URL with base '${APP_BASE_URL}' and endpoint '${endpoint}'. Error: ${e.message}`);
    return { success: false, error: `Lỗi cấu hình URL: ${e.message}` };
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
        }
      } catch (e) { 
         console.warn("[notesActions saveSharedNote] API error response was not valid JSON. Raw text:", responseBodyText);
      }
      const errorMessage = errorData.message || responseBodyText || `Không thể lưu ghi chú chung (status: ${response.status}).`;
      console.error(`[notesActions saveSharedNote] API Error ${response.status} from ${absoluteApiUrl}:`, errorMessage, `Raw Body: ${responseBodyText}`);
      return { success: false, error: errorMessage };
    }
    
    const result: { success: boolean, note: string, modifiedBy: FamilyMember, modifiedAt: string } = await response.json();
    if (result.success) {
        console.log('[notesActions saveSharedNote] Saved data successfully via API.');
        return { success: true, data: { note: result.note, modifiedBy: result.modifiedBy, modifiedAt: result.modifiedAt } };
    } else {
        const errorMessage = (result as any).message || 'Lưu ghi chú không thành công từ API.';
        console.error('[notesActions saveSharedNote] API reported not successful:', result);
        return { success: false, error: errorMessage };
    }
  } catch (error: any) {
    console.error(`[notesActions saveSharedNote] Network or fetch exception for URL ${absoluteApiUrl}:`, error.message, error.stack);
    return { success: false, error: error.message || 'Lỗi kết nối khi lưu ghi chú chung.' };
  }
}
