import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '../../../../lib/supabase-server';

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: NextRequest) {
  try {
    const { email, note } = await req.json();

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanNote = typeof note === 'string' ? note.trim().slice(0, 500) : null;

    const serviceClient = createServiceClient();

    const { data, error } = await serviceClient.rpc('request_user_auth_code', {
      p_email: cleanEmail,
      p_note: cleanNote,
    });

    if (error) {
      console.error('[request-code] RPC error:', error);
      return NextResponse.json({ error: error.message || 'Failed to submit code request' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: data?.message || 'Request submitted successfully. An admin will review and issue your 8-character code.',
      request_id: data?.request_id,
    });
  } catch (err: any) {
    console.error('[request-code] Internal error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
