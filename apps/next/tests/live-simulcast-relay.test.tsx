import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextRequest } from 'next/server';
import {
  buildFfmpegSimulcastArgs,
  buildSimulcastWorkerSpec,
  maskStreamKey,
  validateRtmpIngestUrl,
} from '../lib/live/simulcastRelay';
import { SimulcastRelayPanel } from '../components/live/SimulcastRelayPanel';
import { VanityFunnelOverlay } from '../components/live/VanityFunnelOverlay';
import { POST as simulcastPost } from '../app/api/live/simulcast/route';

const { mockGetUserFromToken } = vi.hoisted(() => ({
  mockGetUserFromToken: vi.fn(),
}));

vi.mock('../lib/supabase-server', () => ({
  getUserFromToken: mockGetUserFromToken,
}));

vi.mock('@digitalcanopy/links', () => ({
  LinksClient: class {
    shortenUrl = vi.fn().mockResolvedValue({
      id: 'lnk-1',
      slug: 'nova-live',
      shortUrl: 'https://links.sunshade.icu/nova-live/simulcast-funnel',
      destinationUrl: 'https://hub.sunshade.network/live/nova-pilot',
      channel: 'simulcast-funnel',
      createdAt: '2026-11-27T12:00:00Z',
    });
  },
}));

describe('TASK-LIVE-SIMULCAST-RELAY: Headless Chromium + FFmpeg RTMP Simulcast Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates RTMP/RTMPS URLs, masks stream keys, and blocks shell metacharacters', () => {
    expect(maskStreamKey('abcd-1234-wxyz-9876')).toMatch(/^\*+9876$/);
    expect(validateRtmpIngestUrl('rtmps://ingest.example.com/live').valid).toBe(true);
    expect(validateRtmpIngestUrl('https://not-rtmp.example.com').valid).toBe(false);
    expect(validateRtmpIngestUrl('rtmp://ingest.example.com/live;rm -rf /').valid).toBe(false);
  });

  it('builds safe FFmpeg tee muxer arguments and redacted worker specs for multiple targets', () => {
    const targets = [
      { platform: 'youtube' as const, ingestUrl: 'rtmp://a.rtmp.youtube.com/live2', streamKey: 'yt-secret-1111' },
      { platform: 'twitch' as const, ingestUrl: 'rtmp://live.twitch.tv/app', streamKey: 'tw-secret-2222' },
    ];

    const ffmpegArgs = buildFfmpegSimulcastArgs({ width: 1280, height: 720, fps: 30, targets, maskKeys: true });
    expect(ffmpegArgs).toContain('-f');
    expect(ffmpegArgs).toContain('tee');
    const teeArg = ffmpegArgs[ffmpegArgs.length - 1];
    expect(teeArg).toContain('1111');
    expect(teeArg).not.toContain('yt-secret-1111');

    const spec = buildSimulcastWorkerSpec({
      creatorSlug: 'nova-pilot',
      creatorName: 'Nova Pilot',
      canonicalUrl: 'https://hub.sunshade.network/live/nova-pilot',
      shortUrl: 'https://links.sunshade.icu/nova-live',
      targets,
    });
    expect(spec.targetUrl).toBe('https://hub.sunshade.network/live/nova-pilot?simulcast=1');
    expect(spec.targets[0].maskedKey).not.toContain('yt-secret');
    expect(spec.overlay.shortUrl).toBe('https://links.sunshade.icu/nova-live');
  });

  it('executes scripts/simulcast-worker.mjs CLI in --dry-run mode with multi-RTMP targets', () => {
    const scriptPath = path.resolve(process.cwd(), '../../scripts/simulcast-worker.mjs');
    const stdout = execFileSync(
      'node',
      [
        scriptPath,
        '--url',
        'https://hub.sunshade.network/live/nova?simulcast=1',
        '--rtmp',
        'rtmp://a.rtmp.youtube.com/live2/key1',
        '--rtmp',
        'rtmp://live.twitch.tv/app/key2',
        '--fps',
        '30',
        '--dry-run',
      ],
      { encoding: 'utf8' }
    );
    const parsed = JSON.parse(stdout.trim());
    expect(parsed.ok).toBe(true);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.targetCount).toBe(2);
    expect(parsed.url).toBe('https://hub.sunshade.network/live/nova?simulcast=1');
  });

  it('provisions redacted worker spec with links.sunshade.icu shortlink via POST /api/live/simulcast', async () => {
    mockGetUserFromToken.mockResolvedValue({ id: 'user-1' });
    const req = new NextRequest('http://localhost/api/live/simulcast', {
      method: 'POST',
      headers: { Authorization: 'Bearer jwt-123' },
      body: JSON.stringify({
        creatorSlug: 'nova-pilot',
        creatorName: 'Nova Pilot',
        canonicalUrl: 'https://hub.sunshade.network/live/nova-pilot',
        targets: [
          {
            platform: 'youtube',
            ingestUrl: 'rtmp://a.rtmp.youtube.com/live2',
            streamKey: 'super-secret-key-9999',
          },
        ],
      }),
    });

    const res = await simulcastPost(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.spec.overlay.shortUrl).toBe('https://links.sunshade.icu/nova-live/simulcast-funnel');
    expect(JSON.stringify(json)).not.toContain('super-secret-key');
  });

  it('renders VanityFunnelOverlay and SimulcastRelayPanel controls', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        spec: {
          targetUrl: 'https://hub.sunshade.network/live/nova-pilot?simulcast=1',
          viewport: { width: 1280, height: 720, fps: 30 },
          targets: [{ platform: 'youtube', ingestUrl: 'rtmp://a.rtmp.youtube.com/live2', rtmpHost: 'a.rtmp.youtube.com', maskedKey: '****9999', enabled: true }],
          overlay: {
            creatorSlug: 'nova-pilot',
            creatorName: 'Nova Pilot',
            canonicalUrl: 'https://hub.sunshade.network/live/nova-pilot',
            shortUrl: 'https://links.sunshade.icu/nova-live',
            ctaLabel: 'Play & Drop at https://links.sunshade.icu/nova-live',
            splitBanner: '95% Direct to Creator • 5% Hub Infra',
          },
          ffmpegPreviewArgs: [],
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <>
        <VanityFunnelOverlay
          visible={true}
          dramaIndex={88}
          overlay={{
            creatorSlug: 'nova-pilot',
            creatorName: 'Nova Pilot',
            canonicalUrl: 'https://hub.sunshade.network/live/nova-pilot',
            shortUrl: 'https://links.sunshade.icu/nova-live',
            ctaLabel: 'Play & Drop at https://links.sunshade.icu/nova-live',
            splitBanner: '95% Direct to Creator • 5% Hub Infra',
          }}
        />
        <SimulcastRelayPanel
          creatorSlug="nova-pilot"
          creatorName="Nova Pilot"
          canonicalUrl="https://hub.sunshade.network/live/nova-pilot"
          authAccessToken="jwt-123"
          overlayEnabled={true}
          onToggleOverlay={vi.fn()}
        />
      </>
    );

    expect(screen.getByTestId('vanity-funnel-overlay')).toBeInTheDocument();
    expect(screen.getByText('Drama 88')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('simulcast-key-input-0'), {
      target: { value: 'stream-key-9999' },
    });
    fireEvent.click(screen.getByTestId('generate-simulcast-spec-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('simulcast-worker-spec')).toBeInTheDocument();
    });

    vi.unstubAllGlobals();
  });
});
