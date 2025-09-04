import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ message: 'Logged out successfully' });
  
  // Clear the session cookie
  response.cookies.set('jfj_session', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
    sameSite: 'lax'
  });
  
  return response;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}