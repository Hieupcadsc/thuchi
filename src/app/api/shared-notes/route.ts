import { NextRequest, NextResponse } from 'next/server';
import { firestoreService } from '@/lib/firestore-service';
import type { FamilyMember } from '@/types';

// GET /api/shared-notes - get shared note for family
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId');

    if (!familyId) {
      return NextResponse.json(
        { error: 'familyId query parameter is required' },
        { status: 400 }
      );
    }

    const sharedNote = await firestoreService.getSharedNote(familyId);
    
    if (!sharedNote) {
      // Return empty note if not found
      return NextResponse.json({
        content: '',
        modifiedBy: null,
        modifiedAt: null
      });
    }

    return NextResponse.json(sharedNote);
  } catch (error) {
    console.error('Error fetching shared note:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shared note' },
      { status: 500 }
    );
  }
}

// POST /api/shared-notes - update shared note
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { familyId, content, modifiedBy } = body;

    // Validate required fields
    if (!familyId || typeof content !== 'string' || !modifiedBy) {
      return NextResponse.json(
        { error: 'familyId, content, and modifiedBy are required' },
        { status: 400 }
      );
    }

    await firestoreService.updateSharedNote(familyId, content, modifiedBy);

    console.log(`[Firestore SharedNotes] Note updated for family ${familyId} by ${modifiedBy}`);
    return NextResponse.json({ 
      success: true, 
      message: 'Shared note updated successfully' 
    });
  } catch (error) {
    console.error('Error updating shared note:', error);
    return NextResponse.json(
      { error: 'Failed to update shared note' },
      { status: 500 }
    );
  }
}
