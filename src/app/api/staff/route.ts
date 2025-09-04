import { NextRequest, NextResponse } from 'next/server';
import { dbHelpers } from '@shared/database-helpers';

export async function GET(request: NextRequest) {
  try {
    const staff = await dbHelpers.getStaff();
    return NextResponse.json(staff || []);
  } catch (error) {
    console.error('Staff API error:', error);
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newStaff = await dbHelpers.createStaff(body);
    return NextResponse.json(newStaff, { status: 201 });
  } catch (error) {
    console.error('Staff API error:', error);
    return NextResponse.json({ error: 'Failed to create staff member' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}