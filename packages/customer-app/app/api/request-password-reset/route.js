import { NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { sendEmail } from '@esim/shared/lib/email';
import PasswordResetEmail from '../../../emails/PasswordResetEmail';
import { getAdminDb } from '@esim/shared/lib/firebaseAdmin';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists in Supabase
    const adminDb = getAdminDb();
    const { data: users, error } = await adminDb
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (error || !users || users.length === 0) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({ 
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    }

    const userData = users[0];

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

    // Save token to user document
    await adminDb
      .from('users')
      .update({
        reset_token: resetToken,
        reset_token_expiry: resetTokenExpiry,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userData.id);

    // Create reset link
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.simnetiq.store'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Render email template
    let emailHtml;
    try {
      emailHtml = await render(
        <PasswordResetEmail 
          name={userData.display_name || userData.name || 'there'} 
          resetLink={resetLink}
        />
      );
    } catch (renderError) {
      throw new Error(`Email template rendering failed: ${renderError.message}`);
    }

    const emailText = `
Hi ${userData.display_name || userData.name || 'there'},

We received a request to reset your password for your Simnetiq account.

Click here to reset your password: ${resetLink}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, please ignore this email.

© 2025 Simnetiq. All rights reserved.
    `;

    try {
      await sendEmail({
        to: email,
        subject: 'Reset Your Password - Simnetiq',
        html: emailHtml,
        text: emailText,
      });
    } catch (emailError) {
      throw new Error(`Email sending failed: ${emailError.message}`);
    }

    return NextResponse.json({ 
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to process password reset request', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
