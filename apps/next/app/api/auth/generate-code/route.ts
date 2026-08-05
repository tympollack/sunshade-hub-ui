import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '../../../../utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSSRClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to request a user code.' }, { status: 401 });
    }

    const { data, error } = await supabase.rpc('generate_user_auth_code');

    if (error) {
      console.error('[generate-code] RPC error:', error);
      return NextResponse.json({ error: error.message || 'Failed to generate user code' }, { status: 500 });
    }

    return NextResponse.json({
      code: data.code,
      expires_at: data.expires_at,
    });
  } catch (err: any) {
    console.error('[generate-code] Internal error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
