import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { buildIsoBmffMp4 } from '../lib/live/mp4Muxer';
import {
  computeVerticalCropLayout,
  exportVerticalMp4Clip,
  mintClipShareLink,
  VERTICAL_CLIP_HEIGHT,
  VERTICAL_CLIP_WIDTH,
} from '../lib/live/webcodecsClipper';
import { VerticalClipExporterPanel } from '../components/live/VerticalClipExporterPanel';

const { mockShortenUrl } = vi.hoisted(() => ({
  mockShortenUrl: vi.fn().mockResolvedValue({
    id: 'lnk-clip-1',
    slug: 'clip9x16',
    shortUrl: 'https://links.sunshade.icu/clip9x16/vertical-clip',
    destinationUrl: 'https://hub.sunshade.network/live/nova-pilot?t=5000&clipEnd=15000',
    channel: 'vertical-clip',
    createdAt: '2026-11-27T12:00:00Z',
  }),
}));

vi.mock('@digitalcanopy/links', () => ({
  LinksClient: class {
    shortenUrl = mockShortenUrl;
  },
}));

describe('TASK-LIVE-WEBCODECS-CLIPPER: 9:16 Vertical MP4 Exporter & links.sunshade.icu Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes 1080x1920 vertical 9:16 crop layout from 16:9 stage', () => {
    const layout = computeVerticalCropLayout(1280, 720);
    expect(layout.targetWidth).toBe(VERTICAL_CLIP_WIDTH);
    expect(layout.targetHeight).toBe(VERTICAL_CLIP_HEIGHT);
    expect(layout.stageRect.width).toBe(1080);
    expect(layout.pipRect.y).toBeGreaterThan(layout.stageRect.y);
  });

  it('muxes H.264 encoded samples into a compliant ISO BMFF MP4 box stream', () => {
    const mp4 = buildIsoBmffMp4({
      width: 1080,
      height: 1920,
      samples: [
        { data: new Uint8Array([0x00, 0x00, 0x00, 0x04, 0x65, 0x88, 0x84, 0x21]), durationTicks: 1000, isKeyframe: true },
        { data: new Uint8Array([0x00, 0x00, 0x00, 0x03, 0x41, 0x9a, 0x01]), durationTicks: 1000, isKeyframe: false },
      ],
    });

    const headerStr = new TextDecoder().decode(mp4.subarray(4, 8));
    expect(headerStr).toBe('ftyp');
    const fullAscii = new TextDecoder('latin1').decode(mp4);
    expect(fullAscii).toContain('moov');
    expect(fullAscii).toContain('mdat');
    expect(fullAscii).toContain('avc1');
  });

  it('exports a 9:16 vertical MP4 via WebCodecs VideoEncoder and mints a links.sunshade.icu URL', async () => {
    class MockVideoFrame {
      close = vi.fn();
      constructor(public source: any, public init: any) {}
    }
    class MockVideoEncoder {
      private outputCb: (chunk: any, metadata?: any) => void;
      configure = vi.fn();
      close = vi.fn();
      constructor(init: { output: (chunk: any, metadata?: any) => void }) {
        this.outputCb = init.output;
      }
      encode = vi.fn((_frame: any, opts?: { keyFrame?: boolean }) => {
        const sampleBytes = new Uint8Array([0x00, 0x00, 0x00, 0x02, 0x65, 0x01]);
        this.outputCb(
          {
            type: opts?.keyFrame ? 'key' : 'delta',
            byteLength: sampleBytes.length,
            copyTo: (dest: Uint8Array) => dest.set(sampleBytes),
          },
          {
            decoderConfig: {
              description: new Uint8Array([0x01, 0x42, 0xe0, 0x1f, 0xff, 0xe1, 0x00, 0x00, 0x01, 0x00, 0x00]),
            },
          }
        );
      });
      flush = vi.fn().mockResolvedValue(undefined);
    }

    const shortRes = await mintClipShareLink({
      creatorSlug: 'nova-pilot',
      matchId: 'match-77',
      startMs: 5000,
      endMs: 15000,
      title: 'Sky Skirmish Clutch',
    });
    expect(shortRes.shortUrl).toBe('https://links.sunshade.icu/clip9x16/vertical-clip');

    const exported = await exportVerticalMp4Clip({
      creatorSlug: 'nova-pilot',
      creatorName: 'Nova Pilot',
      title: 'Sky Skirmish Clutch',
      startMs: 5000,
      endMs: 6000,
      fps: 15,
      dramaIndex: 92.4,
      score: 1450,
      shortUrl: shortRes.shortUrl,
      VideoEncoderCtor: MockVideoEncoder as any,
      VideoFrameCtor: MockVideoFrame as any,
    });

    expect(exported.width).toBe(1080);
    expect(exported.height).toBe(1920);
    expect(exported.frameCount).toBe(15);
    expect(exported.blob.type).toBe('video/mp4');
    expect(exported.mp4Bytes.byteLength).toBeGreaterThan(150);
  });

  it('renders VerticalClipExporterPanel and mints links.sunshade.icu share link on click', async () => {
    render(
      <VerticalClipExporterPanel
        creatorSlug="nova-pilot"
        creatorName="Nova Pilot"
        title="Sky Skirmish Clutch"
        matchId="match-77"
        currentPlayheadMs={5000}
        durationMs={60_000}
        dramaIndex={88.2}
        score={1200}
      />
    );

    expect(screen.getByTestId('vertical-clip-exporter-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('mint-clip-shortlink-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('clipper-shortlink-box')).toHaveTextContent(
        'https://links.sunshade.icu/clip9x16/vertical-clip'
      );
    });
  });
});
