
'use server';

import type { FamilyMember } from '@/types';
import { useAuthStore } from '@/hooks/useAuth'; // To get currentUser if needed, though API takes modifiedBy

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
    const apiUrl = `/api/shared-notes`;
    // In server actions, relative URLs for fetch should work if API route is in the same app.
    // If deployed separately or issues arise, use process.env.NEXT_PUBLIC_APP_URL
    const response = await fetch(apiUrl, { cache: 'no-store' });

    if (!response.ok) {
      let errorData: any = {};
      let responseBodyText = '';
      try {
        responseBodyText = await response.text();
        errorData = JSON.parse(responseBodyText);
      } catch (e) { /* ignore */ }
      console.error(`[notesActions getSharedNote] API Error ${response.status}:`, errorData.message || responseBodyText);
      throw new Error(errorData.message || responseBodyText || 'Không thể tải ghi chú chung.');
    }
    const data: SharedNoteData = await response.json();
    console.log('[notesActions getSharedNote] Fetched data:', data);
    return data;
  } catch (error: any) {
    console.error('[notesActions getSharedNote] Exception:', error);
    return { error: error.message || 'Lỗi khi tải ghi chú chung.' };
  }
}

export async function saveSharedNote(noteContent: string, performingUser: FamilyMember): Promise<SaveNoteResult> {
  console.log(`[notesActions] saveSharedNote called by ${performingUser}`);
  if (typeof noteContent !== 'string') {
    return { success: false, error: 'Nội dung ghi chú không hợp lệ.' };
  }
  if (!performingUser) {
    return { success: false, error: 'Không xác định được người dùng.' };
  }

  try {
    const apiUrl = `/api/shared-notes`;
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
        errorData = JSON.parse(responseBodyText);
      } catch (e) { /* ignore */ }
      console.error(`[notesActions saveSharedNote] API Error ${response.status}:`, errorData.message || responseBodyText);
      throw new Error(errorData.message || responseBodyText || 'Không thể lưu ghi chú chung.');
    }
    const data: SharedNoteData & {success: boolean} = await response.json();
    console.log('[notesActions saveSharedNote] Saved data:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('[notesActions saveSharedNote] Exception:', error);
    return { success: false, error: error.message || 'Lỗi khi lưu ghi chú chung.' };
  }
}
