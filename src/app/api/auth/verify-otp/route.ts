import { NextRequest, NextResponse } from 'next/server';
import { dbHelpers } from '@shared/database-helpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, otp } = body;
    const actualOtp = code || otp; // Accept both 'code' and 'otp' field names

    console.log('Parsed email:', email);
    console.log('Final actualOtp:', actualOtp);

    if (!email || !actualOtp) {
      return NextResponse.json({ 
        error: 'Email and OTP are required',
        debug: {
          receivedEmail: email,
          receivedCode: code,
          receivedOtp: otp,
          actualOtp: actualOtp,
          bodyType: typeof body,
          rawBody: body
        }
      }, { status: 400 });
    }

    // For demo purposes - accept any 6-digit OTP
    if (actualOtp.length === 6 && /^\d+$/.test(actualOtp)) {
      // Look up the actual staff member by email
      const staffMember = await dbHelpers.getStaffByEmail(email);
      
      if (!staffMember) {
        return NextResponse.json({ 
          error: 'Staff member not found with this email address' 
        }, { status: 400 });
      }

      // Create user object with real staff data
      const user = {
        id: staffMember.id,
        firstName: staffMember.firstName,
        lastName: staffMember.lastName,
        email: staffMember.email,
        role: staffMember.role
      };

      // Set a session cookie
      const sessionData = JSON.stringify(user);
      const response = NextResponse.json({
        message: 'Authentication successful',
        user
      });
      
      response.cookies.set('jfj_session', Buffer.from(sessionData).toString('base64'), {
        httpOnly: true,
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        sameSite: 'lax'
      });

      return response;
    }

    return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}