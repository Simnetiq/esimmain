import { NextResponse } from 'next/server';
import { collection, query, getDocs, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';

// GET - Retrieve FCM tokens (for admin dashboard)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit')) || 100;

    let q = query(collection(db, 'fcm_tokens'), where('active', '==', true));
    
    if (userId) {
      q = query(q, where('userId', '==', userId));
    }

    const snapshot = await getDocs(q);
    const tokens = [];

    snapshot.forEach((doc) => {
      tokens.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Limit results
    const limitedTokens = tokens.slice(0, limit);

    return NextResponse.json({
      success: true,
      tokens: limitedTokens,
      totalCount: tokens.length
    });

  } catch (error) {
    console.error('❌ Error fetching FCM tokens:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}

// POST - Save FCM token (called from mobile app)
export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      token, 
      userId, 
      platform, // 'ios' or 'android'
      appVersion,
      deviceModel 
    } = body;

    if (!token || !userId) {
      return NextResponse.json(
        { error: 'Token and userId are required' },
        { status: 400 }
      );
    }

    // Check if token already exists
    const existingQuery = query(
      collection(db, 'fcm_tokens'),
      where('token', '==', token)
    );
    
    const existingSnapshot = await getDocs(existingQuery);
    
    if (existingSnapshot.empty) {
      // Create new token document
      const tokenData = {
        token,
        userId,
        platform: platform || 'unknown',
        appVersion: appVersion || 'unknown',
        deviceModel: deviceModel || 'unknown',
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastUsedAt: serverTimestamp()
      };

      await setDoc(doc(collection(db, 'fcm_tokens')), tokenData);
    } else {
      // Update existing token
      const existingDoc = existingSnapshot.docs[0];
      await setDoc(doc(db, 'fcm_tokens', existingDoc.id), {
        userId,
        platform: platform || existingDoc.data().platform,
        appVersion: appVersion || existingDoc.data().appVersion,
        deviceModel: deviceModel || existingDoc.data().deviceModel,
        active: true,
        updatedAt: serverTimestamp(),
        lastUsedAt: serverTimestamp()
      }, { merge: true });
      
    }

    return NextResponse.json({
      success: true,
      message: 'Token saved successfully'
    });

  } catch {
    return NextResponse.json(
      { error: 'Failed to save token' },
      { status: 500 }
    );
  }
}
