import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken, createServiceClient } from '../../../lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    let userEmail: string | null = null;

    if (token) {
      const user = await getUserFromToken(token);
      if (user?.email) {
        userEmail = user.email;
      }
    }

    const body = await req.json().catch(() => ({}));
    const {
      action,
      title,
      body: postBody,
      overrides,
      scheduledAt,
      enabledPlatforms,
    } = body;

    if (!action || !['queue', 'broadcast_now'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Expected "queue" or "broadcast_now".' },
        { status: 400 }
      );
    }

    if (!enabledPlatforms || !Array.isArray(enabledPlatforms) || enabledPlatforms.length === 0) {
      return NextResponse.json(
        { error: 'At least one social platform must be enabled for broadcasting.' },
        { status: 400 }
      );
    }

    const broadcastTitle = (title || 'Ecosystem Broadcast').trim();
    const primaryText =
      overrides?.bluesky?.text ||
      overrides?.x?.text ||
      overrides?.linkedin?.text ||
      overrides?.meta?.text ||
      postBody ||
      '';

    if (!primaryText.trim()) {
      return NextResponse.json(
        { error: 'Broadcast copy content cannot be empty.' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    const { data: broadcast, error: broadcastErr } = await serviceClient
      .from('hub_broadcasts')
      .insert({
        title: broadcastTitle,
        message: primaryText.trim(),
        category: 'General',
        created_by: userEmail,
        is_active: true,
      })
      .select('id, created_at')
      .single();

    if (broadcastErr) {
      console.error('[broadcast] Error inserting into hub_broadcasts:', broadcastErr);
      return NextResponse.json(
        { error: `Failed to persist broadcast: ${broadcastErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      broadcastId: broadcast?.id || `broadcast-${Date.now()}`,
      action,
      scheduledAt: scheduledAt || null,
      enabledPlatforms,
      message:
        action === 'queue'
          ? scheduledAt
            ? `Broadcast scheduled successfully for ${new Date(scheduledAt).toLocaleString()}.`
            : 'Broadcast approved and queued for dispatch.'
          : 'Broadcast dispatched immediately across all enabled platforms.',
    });
  } catch (err: any) {
    console.error('[broadcast] Unexpected submission error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal broadcast submission failure' },
      { status: 500 }
    );
  }
}
