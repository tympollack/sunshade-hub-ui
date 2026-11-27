import { LinksClient, type ShortLinkResult } from '@digitalcanopy/links';
import { buildIsoBmffMp4, type EncodedMp4Sample } from './mp4Muxer';

export const VERTICAL_CLIP_WIDTH = 1080;
export const VERTICAL_CLIP_HEIGHT = 1920;
export const DEFAULT_CLIP_FPS = 30;

export interface VerticalCropLayout {
  targetWidth: number;
  targetHeight: number;
  stageRect: { x: number; y: number; width: number; height: number };
  pipRect: { x: number; y: number; width: number; height: number };
  captionY: number;
}

export interface VerticalClipExportOptions {
  creatorSlug: string;
  creatorName: string;
  title: string;
  startMs: number;
  endMs: number;
  fps?: number;
  dramaIndex?: number;
  score?: number;
  shortUrl?: string;
  sourceCanvas?: HTMLCanvasElement | null;
  sourceVideo?: HTMLVideoElement | null;
  VideoEncoderCtor?: typeof VideoEncoder;
  VideoFrameCtor?: typeof VideoFrame;
  onProgress?: (pct: number) => void;
}

export interface VerticalClipExportResult {
  mp4Bytes: Uint8Array;
  blob: Blob;
  filename: string;
  durationMs: number;
  frameCount: number;
  width: number;
  height: number;
}

export function isWebCodecsSupported(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as any).VideoEncoder === 'function' &&
    typeof (globalThis as any).VideoFrame === 'function'
  );
}

export function computeVerticalCropLayout(
  sourceWidth = 1280,
  sourceHeight = 720,
  targetWidth = VERTICAL_CLIP_WIDTH,
  targetHeight = VERTICAL_CLIP_HEIGHT
): VerticalCropLayout {
  const safeSrcW = Math.max(1, sourceWidth);
  const safeSrcH = Math.max(1, sourceHeight);
  const stageH = Math.round(targetWidth * (safeSrcH / safeSrcW));
  const clampedStageH = Math.min(Math.round(targetHeight * 0.56), Math.max(540, stageH));
  const stageY = 180;
  const pipSize = Math.round(targetWidth * 0.42);

  return {
    targetWidth,
    targetHeight,
    stageRect: {
      x: 0,
      y: stageY,
      width: targetWidth,
      height: clampedStageH,
    },
    pipRect: {
      x: Math.round((targetWidth - pipSize) / 2),
      y: stageY + clampedStageH + 64,
      width: pipSize,
      height: pipSize,
    },
    captionY: stageY + clampedStageH + pipSize + 150,
  };
}

export function composeVerticalFrameCanvas(
  canvas: HTMLCanvasElement,
  options: {
    creatorName: string;
    title: string;
    dramaIndex: number;
    score: number;
    shortUrl: string;
    progress: number;
    sourceCanvas?: HTMLCanvasElement | null;
    sourceVideo?: HTMLVideoElement | null;
  }
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const layout = computeVerticalCropLayout(
    options.sourceCanvas?.width || 1280,
    options.sourceCanvas?.height || 720
  );

  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, layout.targetWidth, layout.targetHeight);

  // Header branding
  ctx.fillStyle = '#f97316';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('SUNSHADE LIVE • 9:16 CLIP', 60, 100);
  ctx.fillStyle = '#e4e4e7';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(options.title.slice(0, 42), 60, 146);

  // Stage surface
  if (options.sourceCanvas) {
    ctx.drawImage(
      options.sourceCanvas,
      layout.stageRect.x,
      layout.stageRect.y,
      layout.stageRect.width,
      layout.stageRect.height
    );
  } else {
    ctx.fillStyle = '#18181b';
    ctx.fillRect(layout.stageRect.x, layout.stageRect.y, layout.stageRect.width, layout.stageRect.height);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 4;
    ctx.strokeRect(layout.stageRect.x + 12, layout.stageRect.y + 12, layout.stageRect.width - 24, layout.stageRect.height - 24);
  }

  // Creator PiP card
  ctx.fillStyle = '#18181b';
  ctx.fillRect(layout.pipRect.x, layout.pipRect.y, layout.pipRect.width, layout.pipRect.height);
  if (options.sourceVideo && options.sourceVideo.readyState >= 2) {
    ctx.drawImage(
      options.sourceVideo,
      layout.pipRect.x,
      layout.pipRect.y,
      layout.pipRect.width,
      layout.pipRect.height
    );
  }
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 6;
  ctx.strokeRect(layout.pipRect.x, layout.pipRect.y, layout.pipRect.width, layout.pipRect.height);

  // Telemetry & Funnel CTA
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px monospace';
  ctx.fillText(
    `${options.creatorName} • Drama ${options.dramaIndex.toFixed(1)} • ${options.score.toLocaleString()} PTS`,
    60,
    layout.captionY
  );
  ctx.fillStyle = '#22d3ee';
  ctx.font = 'bold 30px monospace';
  ctx.fillText(options.shortUrl, 60, layout.captionY + 56);
}

export async function exportVerticalMp4Clip(
  options: VerticalClipExportOptions
): Promise<VerticalClipExportResult> {
  const EncoderClass = options.VideoEncoderCtor ?? (globalThis as any).VideoEncoder;
  const FrameClass = options.VideoFrameCtor ?? (globalThis as any).VideoFrame;

  if (typeof EncoderClass !== 'function' || typeof FrameClass !== 'function') {
    throw new Error(
      'WebCodecs VideoEncoder/VideoFrame API is unavailable in this browser.'
    );
  }

  const fps = Math.max(15, Math.min(60, Math.round(options.fps ?? DEFAULT_CLIP_FPS)));
  const startMs = Math.max(0, Math.round(options.startMs));
  const endMs = Math.max(startMs + 1000, Math.round(options.endMs));
  const durationMs = Math.min(60_000, endMs - startMs);
  const frameCount = Math.max(1, Math.round((durationMs / 1000) * fps));
  const frameDurationUs = Math.round(1_000_000 / fps);

  const canvas = document.createElement('canvas');
  canvas.width = VERTICAL_CLIP_WIDTH;
  canvas.height = VERTICAL_CLIP_HEIGHT;

  const samples: EncodedMp4Sample[] = [];
  let avcDecoderConfig: Uint8Array | undefined;
  let encoderError: Error | null = null;

  const encoder = new EncoderClass({
    output: (chunk: any, metadata?: any) => {
      const bytes = new Uint8Array(chunk.byteLength);
      chunk.copyTo(bytes);
      if (metadata?.decoderConfig?.description && !avcDecoderConfig) {
        const desc = metadata.decoderConfig.description;
        avcDecoderConfig = desc instanceof Uint8Array ? desc : new Uint8Array(desc);
      }
      samples.push({
        data: bytes,
        durationTicks: Math.round(30_000 / fps),
        isKeyframe: chunk.type === 'key',
      });
    },
    error: (err: any) => {
      encoderError = err instanceof Error ? err : new Error(String(err));
    },
  });

  encoder.configure({
    codec: 'avc1.42001f',
    width: VERTICAL_CLIP_WIDTH,
    height: VERTICAL_CLIP_HEIGHT,
    bitrate: 4_000_000,
    framerate: fps,
  });

  for (let i = 0; i < frameCount; i++) {
    if (encoderError) throw encoderError;

    composeVerticalFrameCanvas(canvas, {
      creatorName: options.creatorName,
      title: options.title,
      dramaIndex: options.dramaIndex ?? 0,
      score: options.score ?? 0,
      shortUrl: options.shortUrl || `https://hub.sunshade.network/live/${options.creatorSlug}`,
      progress: i / Math.max(1, frameCount - 1),
      sourceCanvas: options.sourceCanvas,
      sourceVideo: options.sourceVideo,
    });

    const frame = new FrameClass(canvas, {
      timestamp: i * frameDurationUs,
      duration: frameDurationUs,
    });
    encoder.encode(frame, { keyFrame: i % fps === 0 });
    frame.close?.();
    options.onProgress?.(Math.round(((i + 1) / frameCount) * 100));
  }

  await encoder.flush();
  encoder.close?.();

  if (encoderError) throw encoderError;

  const mp4Bytes = buildIsoBmffMp4({
    width: VERTICAL_CLIP_WIDTH,
    height: VERTICAL_CLIP_HEIGHT,
    timescale: 30_000,
    samples,
    avcDecoderConfig,
  });

  const blobBytes = new Uint8Array(mp4Bytes.byteLength);
  blobBytes.set(mp4Bytes);
  const blob = new Blob([blobBytes], { type: 'video/mp4' });
  const safeSlug = options.creatorSlug.replace(/[^a-zA-Z0-9_-]/g, '-');

  return {
    mp4Bytes,
    blob,
    filename: `${safeSlug}-vertical-9x16-${startMs}-${startMs + durationMs}.mp4`,
    durationMs,
    frameCount,
    width: VERTICAL_CLIP_WIDTH,
    height: VERTICAL_CLIP_HEIGHT,
  };
}

export async function mintClipShareLink(params: {
  creatorSlug: string;
  matchId?: string;
  startMs: number;
  endMs: number;
  title: string;
  linksClient?: LinksClient;
}): Promise<ShortLinkResult> {
  const client =
    params.linksClient ?? new LinksClient({ enableFallback: true, timeoutMs: 2500 });

  const destination = `https://hub.sunshade.network/live/${encodeURIComponent(
    params.creatorSlug
  )}?t=${Math.max(0, Math.round(params.startMs))}&clipEnd=${Math.max(
    0,
    Math.round(params.endMs)
  )}`;

  return client.shortenUrl({
    destination,
    channel: 'vertical-clip',
    campaign: 'sunshade-live-9x16',
    metadata: {
      creatorSlug: params.creatorSlug,
      matchId: params.matchId ?? null,
      title: params.title,
    },
  });
}
