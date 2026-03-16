import { NextResponse } from 'next/server';
import { getAdminDb } from '@esim/shared/lib/supabaseAdmin';

export async function POST(request) {
  try {
    const { token, email } = await request.json();

    if (!token || !email) {
      return NextResponse.json(
        { error: 'Token and email are required' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    const { data: users, error } = await adminDb
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('reset_token', token)
      .limit(1);

    if (error || !users || users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    const userData = users[0];

    if (!userData.reset_token_expiry || Date.now() > userData.reset_token_expiry) {
      return NextResponse.json(
        { error: 'Reset token has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Token is valid',
      userId: userData.id
    });

  } catch (error) {
    console.error('❌ Error verifying reset token:', error);
    return NextResponse.json(
      { error: 'Failed to verify token', details: error.message },
      { status: 500 }
    );
  }
}
