import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '../../../../lib/supabase-server';
import {
  buildSimulcastWorkerSpec,
  type SimulcastTargetInput,
} from '../../../../lib/live/simulcastRelay';
import { LinksClient } from '@digitalcanopy/links';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: Bearer token is required to build a simulcast relay spec.' },
        { status: 401 }
      );
    }

    const user = await getUserFromToken(token);
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid authentication session.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      creatorSlug,
      creatorName,
      canonicalUrl,
      targets,
      width,
      height,
      fps,
    } = body as {
      creatorSlug?: string;
      creatorName?: string;
      canonicalUrl?: string;
      targets?: SimulcastTargetInput[];
      width?: number;
      height?: number;
      fps?: number;
    };

    if (!creatorSlug || !canonicalUrl || !Array.isArray(targets) || targets.length === 0) {
      return NextResponse.json(
        { error: 'creatorSlug, canonicalUrl, and at least one RTMP target are required.' },
        { status: 400 }
      );
    }

    const linksClient = new LinksClient({ enableFallback: true, timeoutMs: 2500 });
    const shortResult = await linksClient.shortenUrl({
      destination: canonicalUrl,
      channel: 'simulcast-funnel',
      campaign: 'sunshade-live',
      metadata: { creatorSlug },
    });

    const spec = buildSimulcastWorkerSpec({
      creatorSlug,
      creatorName: creatorName || creatorSlug,
      canonicalUrl,
      shortUrl: shortResult.shortUrl,
      targets,
      width,
      height,
      fps,
    });

    return NextResponse.json({
      success: true,
      spec,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to build simulcast relay specification.' },
      { status: 400 }
    );
  }
}
