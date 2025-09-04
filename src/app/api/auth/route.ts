import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Parse session cookie
    const cookieHeader = request.headers.get('cookie') || '';
    const sessionCookie = cookieHeader.split('; ').find(c => c.startsWith('jfj_session='));
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sessionValue = sessionCookie.split('=')[1];
    const sessionData = Buffer.from(sessionValue, 'base64').toString();
    const user = JSON.parse(sessionData);

    // Return user data
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}