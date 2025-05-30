
'use server';

import type { FamilyMember } from '@/types';
// Removed useAuthStore import as currentUser is passed in or not strictly needed for API calls if API handles auth

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

export async function getSharedNote(): Promise<SharedNoteData | { error: string }> {
  console.log('[notesActions] getSharedNote called');
  try {
    // Use relative URL for API call
    const apiUrl = `/api/shared-notes`; 
    console.log(`[notesActions getSharedNote] Fetching from: ${apiUrl}`);
    const response = await fetch(apiUrl, { cache: 'no-store' });

    if (!response.ok) {
      let errorData: any = {};
      let responseBodyText = '';
      try {
        responseBodyText = await response.text();
        // Attempt to parse as JSON only if it's likely JSON
        if (response.headers.get('content-type')?.includes('application/json')) {
            errorData = JSON.parse(responseBodyText);
        }
      } catch (e) { 
        console.warn("[notesActions getSharedNote] API error response was not valid JSON. Raw text:", responseBodyText);
      }
      const errorMessage = errorData.message || responseBodyText || `Không thể tải ghi chú chung (status: ${response.status}).`;
      console.error(`[notesActions getSharedNote] API Error ${response.status}:`, errorMessage);
      throw new Error(errorMessage);
    }
    const data: SharedNoteData = await response.json();
    console.log('[notesActions getSharedNote] Fetched data:', data);
    return data;
  } catch (error: any) {
    console.error('[notesActions getSharedNote] Exception:', error.message, error.stack);
    return { error: error.message || 'Lỗi khi tải ghi chú chung.' };
  }
}

export async function saveSharedNote(noteContent: string, performingUser: FamilyMember): Promise<SaveNoteResult> {
  console.log(`[notesActions] saveSharedNote called by ${performingUser}`);
  if (typeof noteContent !== 'string') {
    return { success: false, error: 'Nội dung ghi chú không hợp lệ.' };
  }
  if (!performingUser) {
    // This check is important if currentUser logic isn't directly available
    // or if performingUser is expected to be validated upstream.
    return { success: false, error: 'Không xác định được người dùng.' };
  }

  try {
    // Use relative URL for API call
    const apiUrl = `/api/shared-notes`; 
    console.log(`[notesActions saveSharedNote] Posting to: ${apiUrl}`);
    const response = await fetch(apiUrl, {
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
      console.error(`[notesActions saveSharedNote] API Error ${response.status}:`, errorMessage);
      throw new Error(errorMessage);
    }
    // Assuming the API returns { success: true, data: { note, modifiedBy, modifiedAt } } on successful POST
    const result: { success: boolean, note: string, modifiedBy: FamilyMember, modifiedAt: string } = await response.json();
    if (result.success) {
        console.log('[notesActions saveSharedNote] Saved data:', result);
        return { success: true, data: { note: result.note, modifiedBy: result.modifiedBy, modifiedAt: result.modifiedAt } };
    } else {
        // This case might not be hit if !response.ok already threw,
        // but good for robustness if API can return 200 OK with success: false
        const errorMessage = (result as any).message || 'Lưu ghi chú không thành công từ API.';
        console.error('[notesActions saveSharedNote] API reported not successful:', result);
        return { success: false, error: errorMessage };
    }
  } catch (error: any) {
    console.error('[notesActions saveSharedNote] Exception:', error.message, error.stack);
    return { success: false, error: error.message || 'Lỗi khi lưu ghi chú chung.' };
  }
}
