import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Initialize Firebase Admin
    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    const admin = await import('firebase-admin');
    
    if (!getApps().length) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
    }
    
    const db = getFirestore();
    
    // Query packages with empty updated_at objects
    const snapshot = await db.collection('dataplans')
      .where('synced_at', '>=', '2025-12-13')
      .get();
    
    console.log(`Found ${snapshot.size} packages synced today`);
    
    let fixed = 0;
    const batchSize = 500;
    let currentBatch = db.batch();
    let batchCount = 0;
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Check if updated_at is empty object or missing
      const needsFix = !data.updated_at || 
                       (typeof data.updated_at === 'object' && 
                        !data.updated_at._seconds && 
                        !data.updated_at.toDate);
      
      if (needsFix) {
        currentBatch.update(doc.ref, {
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        fixed++;
        batchCount++;
        
        if (batchCount >= batchSize) {
          await currentBatch.commit();
          currentBatch = db.batch();
          batchCount = 0;
        }
      }
    }
    
    // Commit remaining
    if (batchCount > 0) {
      await currentBatch.commit();
    }
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${fixed} packages with corrupted updated_at timestamps`,
      total_checked: snapshot.size,
      fixed: fixed
    });
    
  } catch (error) {
    console.error('Repair error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to repair corrupted updated_at timestamps'
  });
}
