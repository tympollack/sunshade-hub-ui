import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '../../../../lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { email, note } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    const { data, error } = await serviceClient.rpc('request_user_auth_code', {
      p_email: email.trim().toLowerCase(),
      p_note: typeof note === 'string' ? note.trim() : null,
    });

    if (error) {
      console.error('[request-code] RPC error:', error);
      return NextResponse.json({ error: error.message || 'Failed to submit code request' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Request submitted successfully. An admin will review and issue your 8-character code.',
      request_id: data.request_id,
    });
  } catch (err: any) {
    console.error('[request-code] Internal error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
