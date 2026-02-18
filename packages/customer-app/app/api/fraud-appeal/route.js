import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';
import { submitBlockAppeal, getFraudStats } from '@esim/shared/services/fraudSignalsService';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, email, contactEmail, contactPhone, reason, additionalInfo } = body;

    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || null;

    if (!email && !userId) {
      return NextResponse.json(
        { error: 'Email or userId is required', code: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    if (!contactEmail && !email) {
      return NextResponse.json(
        { error: 'Contact email is required', code: 'MISSING_CONTACT' },
        { status: 400 }
      );
    }

    const emailToValidate = contactEmail || email;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToValidate)) {
      return NextResponse.json(
        { error: 'Invalid email format', code: 'INVALID_EMAIL' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const fraudStats = await getFraudStats(supabase, userId, email);

    const result = await submitBlockAppeal(supabase, {
      userId,
      email,
      contactEmail: contactEmail || email,
      contactPhone,
      reason: reason || 'Request to review account block',
      additionalInfo,
      ipAddress,
      fraudStats
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to submit appeal', code: 'APPEAL_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      appealId: result.appealId,
      message: 'Your appeal has been submitted. Our support team will review it within 24-48 hours and contact you at the provided email address.'
    });

  } catch (error) {
    console.error('Error submitting fraud appeal:', error);
    return NextResponse.json(
      { error: 'Failed to submit appeal. Please try again or contact support directly.', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const appealId = searchParams.get('appealId');
    const email = searchParams.get('email');

    if (!appealId && !email) {
      return NextResponse.json(
        { error: 'appealId or email is required', code: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    if (appealId) {
      const { data: appealData, error } = await supabase
        .from('fraud_appeals')
        .select('*')
        .eq('id', appealId)
        .single();

      if (error || !appealData) {
        return NextResponse.json(
          { error: 'Appeal not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        appeal: {
          id: appealData.id,
          status: appealData.status,
          createdAt: appealData.created_at,
          resolvedAt: appealData.resolved_at || null,
          resolution: appealData.resolution || null
        }
      });
    }

    if (email) {
      const { data: appeals } = await supabase
        .from('fraud_appeals')
        .select('*')
        .eq('contact_email', email.toLowerCase());

      return NextResponse.json({
        success: true,
        appeals: (appeals || []).map(d => ({
          id: d.id,
          status: d.status,
          createdAt: d.created_at,
          resolvedAt: d.resolved_at || null,
          resolution: d.resolution || null
        }))
      });
    }

  } catch (error) {
    console.error('Error getting appeal status:', error);
    return NextResponse.json(
      { error: 'Failed to get appeal status', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
