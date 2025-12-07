import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@esim/shared/lib/firebaseAdmin';

export async function POST(request) {
  try {
    const { token, email, newPassword } = await request.json();

    if (!token || !email || !newPassword) {
      return NextResponse.json(
        { error: 'Token, email, and new password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Find user by email and token
    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();
    const usersRef = adminDb.collection('users');
    const userQuery = await usersRef
      .where('email', '==', email)
      .where('resetToken', '==', token)
      .limit(1)
      .get();

    if (userQuery.empty) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();

    // Check if token is expired
    if (!userData.resetTokenExpiry || Date.now() > userData.resetTokenExpiry) {
      return NextResponse.json(
        { error: 'Reset token has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Update password in Firebase Auth
    try {
      await adminAuth.updateUser(userDoc.id, {
        password: newPassword,
      });
    } catch (authError) {
      return NextResponse.json(
        { error: 'Failed to update password', details: authError.message },
        { status: 500 }
      );
    }

    // Clear reset token from database
    await userDoc.ref.update({
      resetToken: null,
      resetTokenExpiry: null,
      updatedAt: new Date().toISOString(),
    });


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

