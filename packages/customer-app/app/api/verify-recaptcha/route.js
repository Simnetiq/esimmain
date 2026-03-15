import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
    if (!RECAPTCHA_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: 'Server misconfiguration: RECAPTCHA_SECRET_KEY not set' },
        { status: 503 }
      );
    }

    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No reCAPTCHA token provided' },
        { status: 400 }
      );
    }

    // Verify the reCAPTCHA token with Google
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${token}`;
    
    const verificationResponse = await fetch(verificationUrl, {
      method: 'POST',
    });

    const verificationData = await verificationResponse.json();

    // reCAPTCHA v3 returns a score (0.0 - 1.0)
    // 1.0 is very likely a good interaction, 0.0 is very likely a bot
    if (verificationData.success && verificationData.score >= 0.5) {
      return NextResponse.json({
        success: true,
        score: verificationData.score,
        message: 'reCAPTCHA verification successful',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          score: verificationData.score,
          error: 'reCAPTCHA verification failed. Please try again.',
        },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to verify reCAPTCHA' },
      { status: 500 }
    );
  }
}

