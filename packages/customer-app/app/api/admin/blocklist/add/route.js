import { NextResponse } from 'next/server';
import { db } from '@esim/shared/firebase/config';
import { addToBlocklist } from '@esim/shared/services/fraudDetectionService';

/**
 * Admin API: Add user/email to fraud blocklist
 * 
 * POST /api/admin/blocklist/add
 * 
 * Body:
 * {
 *   userId?: string,
 *   email?: string,
 *   reason: string,
 *   adminId: string
 * }
 * 
 * NOTE: This is a protected endpoint. In production, you should:
 * 1. Verify admin authentication (check Firebase Auth token)
 * 2. Verify admin role in Firestore
 * 3. Add rate limiting
 */
export async function POST(request) {
  try {
    const body = await request.json();
    
    const {
      userId,
      email,
      reason,
      adminId
    } = body;

    // Validate required fields
    if (!reason || !adminId) {
      return NextResponse.json(
        { error: 'Missing required fields: reason, adminId' },
        { status: 400 }
      );
    }

    if (!userId && !email) {
      return NextResponse.json(
        { error: 'Must provide either userId or email' },
        { status: 400 }
      );
    }

    // TODO: Add authentication check here
    // const authHeader = request.headers.get('authorization');
    // const token = await verifyAdminToken(authHeader);
    // if (!token || !token.admin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Add to blocklist
    const result = await addToBlocklist(db, {
      userId,
      email,
      reason,
      createdBy: adminId
    });

    if (!result.success) {
      return NextResponse.json(
        { error: `Failed to add to blocklist: ${result.error}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      blockId: result.blockId,
      message: 'Successfully added to blocklist'
    });

  } catch (error) {
    console.error('Error adding to blocklist:', error);
    return NextResponse.json(
      { error: `Failed to add to blocklist: ${error.message}` },
      { status: 500 }
    );
  }
}

