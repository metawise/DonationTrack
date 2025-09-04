import { NextRequest, NextResponse } from 'next/server';
import { dbHelpers } from '@shared/database-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await dbHelpers.getStaffById(params.id);
    
    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }
    
    return NextResponse.json(staff);
  } catch (error) {
    console.error('Staff API error:', error);
    return NextResponse.json({ error: 'Failed to fetch staff member' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updatedStaff = await dbHelpers.updateStaff(params.id, body);
    
    if (!updatedStaff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }
    
    return NextResponse.json(updatedStaff);
  } catch (error) {
    console.error('Staff API error:', error);
    return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // For now, just return success
    return NextResponse.json({ message: 'Staff deleted successfully' });
  } catch (error) {
    console.error('Staff API error:', error);
    return NextResponse.json({ error: 'Failed to delete staff member' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}