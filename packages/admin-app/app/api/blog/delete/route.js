import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';
import { verifyUserJWT } from '@esim/shared/lib/apiAuth';

async function verifyAdmin(request) {
  const { userId, error } = await verifyUserJWT(request);
  if (error) return { error };

  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return { error: NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 }) };
  }

  return { error: null };
}

export async function DELETE(request) {
  const { error: authError } = await verifyAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Delete translations first (in case CASCADE isn't set)
    const { error: transError } = await supabase
      .from('blog_post_translations')
      .delete()
      .eq('post_id', id);

    if (transError) {
      console.error('[blog/delete] Error deleting translations:', transError);
    }

    // Delete translation jobs
    const { error: jobsError } = await supabase
      .from('translation_jobs')
      .delete()
      .eq('entity_id', id);

    if (jobsError) {
      console.error('[blog/delete] Error deleting translation jobs:', jobsError);
    }

    // Delete the base post
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[blog/delete] Error deleting post:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[blog/delete] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
