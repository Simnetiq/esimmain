import { NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { sendEmail } from '@esim/shared/lib/email';
import { verifyAdminKey } from '@esim/shared/lib/apiAuth';
import VerificationEmail from '../../../emails/VerificationEmail';

export async function POST(request) {
  const authError = verifyAdminKey(request);
  if (authError) return authError;

  try {
    const { email, userName, otpCode } = await request.json();

    if (!email || !otpCode) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    // Render the email template
    const emailHtml = await render(
      <VerificationEmail 
        name={userName} 
        otp={otpCode} 
        expiresInMinutes={10} 
      />
    );

    // Plain text version
    const emailText = `
Hi ${userName || 'there'},

Thank you for signing up! Please verify your email address to complete your registration.

Your Verification Code: ${otpCode}

This code will expire in 10 minutes.

If you didn't create an account with Simnetiq, please ignore this email.

© 2025 Simnetiq. All rights reserved.
    `;

    // Send email via Hostinger
    await sendEmail({
      to: email,
      subject: 'Verify Your Email - Simnetiq',
      html: emailHtml,
      text: emailText,
    });

    return NextResponse.json({ 
      success: true,
      message: 'Verification email sent successfully',
      email
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message, fallback: true },
      { status: 500 }
    );
  }
}

