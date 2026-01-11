import { NextResponse } from 'next/server';
import { getSupabaseServer, verifySupabaseToken } from '@esim/shared/lib/supabaseServer';
import { generateEventPass, validatePassConfiguration } from '@esim/shared/lib/passkit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/passes/event/[id]
 *
 * Generates and returns an Apple Wallet .pkpass file for a specific event.
 * User must be authenticated and registered for the event.
 *
 * Headers:
 *   Authorization: Bearer <supabase-access-token>
 *
 * Response:
 *   Content-Type: application/vnd.apple.pkpass
 *   Content-Disposition: attachment; filename="foundmiles-{eventId}.pkpass"
 */
export async function GET(request, { params }) {
  try {
    const { id: eventId } = await params;

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required', code: 'MISSING_EVENT_ID' },
        { status: 400 }
      );
    }

    // Validate pass configuration before proceeding
    const configValidation = validatePassConfiguration();
    if (!configValidation.success) {
      console.error('Pass configuration errors:', configValidation.errors);
      return NextResponse.json(
        {
          error: 'Apple Wallet pass generation is not configured',
          code: 'PASS_NOT_CONFIGURED'
        },
        { status: 503 }
      );
    }

    // Get authorization token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.split('Bearer ')[1];

    // Verify the Supabase access token
    const { user, error: authError } = await verifySupabaseToken(accessToken);

    if (authError || !user) {
      console.error('Token verification failed:', authError?.message);
      return NextResponse.json(
        { error: 'Invalid or expired token', code: 'INVALID_TOKEN' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const supabase = getSupabaseServer();

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('Event fetch error:', eventError?.message);
      return NextResponse.json(
        { error: 'Event not found', code: 'EVENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify user is registered for this event
    const { data: participant, error: participantError } = await supabase
      .from('event_participants')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: 'Not registered for this event', code: 'NOT_REGISTERED' },
        { status: 403 }
      );
    }

    // Prepare event object for pass generation
    const eventData = {
      id: eventId,
      title: event.title || event.name || 'Running Event',
      start_time: event.start_time || event.starts_at || event.date,
      end_time: event.end_time || event.ends_at,
      location_name: event.location_name || event.location || event.venue,
      distance_km: event.distance_km || event.distance,
      location_lat: event.location_lat || event.latitude,
      location_lng: event.location_lng || event.longitude,
      organizer_name: event.organizer_name || event.organizer
    };

    // Prepare user object for pass generation
    const userData = {
      id: userId,
      name: user.user_metadata?.name || user.user_metadata?.full_name,
      email: user.email
    };

    // Generate the pass
    const passBuffer = await generateEventPass(eventData, userData);

    // Return the pass as a downloadable file
    return new NextResponse(passBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="foundmiles-${eventId}.pkpass"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Error generating event pass:', error);

    // Handle specific passkit errors
    if (error.message?.includes('certificate')) {
      return NextResponse.json(
        {
          error: 'Pass signing certificate error',
          code: 'CERTIFICATE_ERROR'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to generate event pass',
        code: 'GENERATION_FAILED',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
