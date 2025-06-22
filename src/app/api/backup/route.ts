import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory storage (in production, use Redis, Firebase, or external storage)
let backupStorage: any = null;

export async function POST(request: NextRequest) {
  try {
    const backupData = await request.json();
    
    // In production, save to:
    // - Firebase Storage
    // - Google Drive API
    // - AWS S3
    // - GitHub Gist (private)
    // - Your own database
    
    // For now, using simple storage (you should replace this)
    backupStorage = backupData;
    
    console.log('[API] Backup saved successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Backup saved successfully',
      timestamp: backupData.timestamp 
    });
  } catch (error) {
    console.error('[API] Failed to save backup:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save backup' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    if (!backupStorage) {
      return NextResponse.json(
        { success: false, error: 'No backup found' },
        { status: 404 }
      );
    }
    
    console.log('[API] Backup retrieved successfully');
    
    return NextResponse.json(backupStorage);
  } catch (error) {
    console.error('[API] Failed to retrieve backup:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve backup' },
      { status: 500 }
    );
  }
} 