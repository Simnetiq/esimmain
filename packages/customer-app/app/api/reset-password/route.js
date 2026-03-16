import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@esim/shared/lib/supabaseAdmin';

export async function POST(request) {
  try {
    const { token, email, newPassword } = await request.json();

    if (!token || !email || !newPassword) {
      return NextResponse.json(
        { error: 'Token, email, and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Find user by email and token using Supabase admin client
    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();

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

    // Check if token is expired
    if (!userData.reset_token_expiry || Date.now() > userData.reset_token_expiry) {
      return NextResponse.json(
        { error: 'Reset token has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Update password in Supabase Auth
    try {
      const { error: authErr } = await adminAuth.updateUserById(userData.id, {
        password: newPassword,
      });
      if (authErr) throw authErr;
    } catch (authError) {
      return NextResponse.json(
        { error: 'Failed to update password', details: authError.message },
        { status: 500 }
      );
    }

    // Clear reset token from database
    await adminDb
      .from('users')
      .update({
        reset_token: null,
        reset_token_expiry: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userData.id);

    return NextResponse.json({ 
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to reset password', details: error.message },
      { status: 500 }
    );
  }
}
