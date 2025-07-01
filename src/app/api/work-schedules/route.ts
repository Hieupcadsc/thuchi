import { NextRequest, NextResponse } from 'next/server';
import { firestoreService } from '@/lib/firestore-service';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const familyId = url.searchParams.get('familyId');
    
    if (!familyId) {
      return NextResponse.json({ error: 'Family ID is required' }, { status: 400 });
    }

    const schedules = await firestoreService.getWorkSchedules(familyId);
    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('Error fetching work schedules:', error);
    return NextResponse.json({ error: 'Failed to fetch work schedules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.title || !body.date || !body.startTime || !body.endTime) {
      return NextResponse.json({ 
        error: 'Title, date, start time, and end time are required' 
      }, { status: 400 });
    }

    const newSchedule = await firestoreService.addWorkSchedule(body);
    return NextResponse.json({ schedule: newSchedule }, { status: 201 });
  } catch (error) {
    console.error('Error creating work schedule:', error);
    return NextResponse.json({ error: 'Failed to create work schedule' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ 
        error: 'Schedule ID is required' 
      }, { status: 400 });
    }

    await firestoreService.updateWorkSchedule(id, updates);
    return NextResponse.json({ message: 'Work schedule updated successfully' });
  } catch (error) {
    console.error('Error updating work schedule:', error);
    return NextResponse.json({ error: 'Failed to update work schedule' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    // Handle single schedule deletion by ID
    if (id) {
      await firestoreService.deleteWorkSchedule(id);
      return NextResponse.json({ message: 'Work schedule deleted successfully' });
    }

    // Handle bulk deletion by employee and month
    const body = await request.json();
    const { familyId, employeeName, month, year } = body;
    
    if (!familyId || !employeeName || !month || !year) {
      return NextResponse.json({ 
        error: 'Either ID or (familyId, employeeName, month, year) is required' 
      }, { status: 400 });
    }

    await firestoreService.deleteWorkSchedulesByEmployeeAndMonth(familyId, employeeName, year, month);
    return NextResponse.json({ 
      message: `Work schedules deleted successfully for ${employeeName} in ${month}/${year}` 
    });
  } catch (error) {
    console.error('Error deleting work schedule:', error);
    return NextResponse.json({ error: 'Failed to delete work schedule' }, { status: 500 });
  }
} 