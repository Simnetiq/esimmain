import { NextResponse } from 'next/server';
import { getAdminDb } from '@esim/shared/lib/firebaseAdmin';

export async function POST(request) {
  try {
    const { token, email } = await request.json();

    if (!token || !email) {
      return NextResponse.json(
        { error: 'Token and email are required' },
        { status: 400 }
      );
    }

    // Find user by email and token
    const adminDb = getAdminDb();
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

    return NextResponse.json({ 
      success: true,
      message: 'Token is valid',
      userId: userDoc.id
    });

  } catch (error) {
    console.error('❌ Error verifying reset token:', error);
    return NextResponse.json(
      { error: 'Failed to verify token', details: error.message },
      { status: 500 }
    );
  }
}

