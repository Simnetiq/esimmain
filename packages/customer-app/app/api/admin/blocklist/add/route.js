import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';
import { addToBlocklist } from '@esim/shared/services/fraudDetectionService';

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, email, reason, adminId } = body;

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

    const supabase = getSupabaseAdmin();

    const result = await addToBlocklist(supabase, {
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
