import { NextResponse } from 'next/server';
import { db } from '@esim/shared/firebase/config';
import { submitBlockAppeal, getFraudStats } from '@esim/shared/services/fraudSignalsService';

export const dynamic = 'force-dynamic';

/**
 * Fraud Appeal API
 * 
 * Allows blocked users to submit an appeal to have their account reviewed
 * 
 * POST /api/fraud-appeal
 * Body: { userId, email, contactEmail, reason, additionalInfo }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, email, contactEmail, contactPhone, reason, additionalInfo } = body;

    // Get client IP for logging
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

    // Validate email format
    const emailToValidate = contactEmail || email;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToValidate)) {
      return NextResponse.json(
        { error: 'Invalid email format', code: 'INVALID_EMAIL' },
        { status: 400 }
      );
    }

    // Get fraud stats to include in appeal
    const fraudStats = await getFraudStats(db, userId, email);

    // Submit the appeal
    const result = await submitBlockAppeal(db, {
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

    console.log(`📨 Fraud appeal submitted: ${userId || email} - Appeal ID: ${result.appealId}`);

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

/**
 * GET endpoint to check appeal status
 * GET /api/fraud-appeal?appealId=xxx
 */
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

    const { collection, query, where, getDocs, doc, getDoc } = await import('firebase/firestore');

    if (appealId) {
      // Get specific appeal
      const appealRef = doc(db, 'fraud_appeals', appealId);
      const appealSnap = await getDoc(appealRef);

      if (!appealSnap.exists()) {
        return NextResponse.json(
          { error: 'Appeal not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      const appealData = appealSnap.data();
      
      return NextResponse.json({
        success: true,
        appeal: {
          id: appealSnap.id,
          status: appealData.status,
          createdAt: appealData.createdAt?.toDate?.()?.toISOString() || null,
          resolvedAt: appealData.resolvedAt?.toDate?.()?.toISOString() || null,
          resolution: appealData.resolution || null
        }
      });
    }

    // Get appeals by email
    if (email) {
      const appealsRef = collection(db, 'fraud_appeals');
      const q = query(appealsRef, where('contactEmail', '==', email.toLowerCase()));
      const snapshot = await getDocs(q);

      const appeals = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        appeals.push({
          id: docSnap.id,
          status: data.status,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          resolvedAt: data.resolvedAt?.toDate?.()?.toISOString() || null,
          resolution: data.resolution || null
        });
      });

      return NextResponse.json({
        success: true,
        appeals
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
