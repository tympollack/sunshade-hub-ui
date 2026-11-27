export type SimulcastPlatform = 'youtube' | 'twitch' | 'kick' | 'custom';

export interface SimulcastTargetInput {
  platform: SimulcastPlatform;
  ingestUrl: string;
  streamKey: string;
  enabled?: boolean;
}

export interface RedactedSimulcastTarget {
  platform: SimulcastPlatform;
  ingestUrl: string;
  rtmpHost: string;
  maskedKey: string;
  enabled: boolean;
}

export interface VanityFunnelOverlayConfig {
  creatorSlug: string;
  creatorName: string;
  canonicalUrl: string;
  shortUrl: string;
  ctaLabel: string;
  splitBanner: string;
}

export interface SimulcastWorkerSpec {
  targetUrl: string;
  viewport: {
    width: number;
    height: number;
    fps: number;
  };
  targets: RedactedSimulcastTarget[];
  overlay: VanityFunnelOverlayConfig;
  ffmpegPreviewArgs: string[];
}

export const PLATFORM_INGEST_PRESETS: Record<SimulcastPlatform, { label: string; defaultUrl: string }> = {
  youtube: {
    label: 'YouTube Live',
    defaultUrl: 'rtmp://a.rtmp.youtube.com/live2',
  },
  twitch: {
    label: 'Twitch',
    defaultUrl: 'rtmp://live.twitch.tv/app',
  },
  kick: {
    label: 'Kick',
    defaultUrl: 'rtmps://fa723fc1b171.global-contribute.live-video.net/app',
  },
  custom: {
    label: 'Custom RTMP(S)',
    defaultUrl: 'rtmp://ingest.sunshade.network/live',
  },
};

const CONTROL_OR_SHELL_CHAR = /[\s;|&$`<>\\'"\r\n\0]/;

export function maskStreamKey(streamKey: string): string {
  const clean = (streamKey || '').trim();
  if (!clean) return '****';
  if (clean.length <= 4) return '****';
  return `${'*'.repeat(Math.min(12, clean.length - 4))}${clean.slice(-4)}`;
}

export function validateRtmpIngestUrl(rawUrl: string): { valid: boolean; host: string; error?: string } {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return { valid: false, host: '', error: 'RTMP ingest URL is required.' };
  }
  if (CONTROL_OR_SHELL_CHAR.test(trimmed)) {
    return { valid: false, host: '', error: 'RTMP ingest URL contains invalid characters.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, host: '', error: 'RTMP ingest URL is not a valid URL.' };
  }

  if (parsed.protocol !== 'rtmp:' && parsed.protocol !== 'rtmps:') {
    return { valid: false, host: '', error: 'Protocol must be rtmp:// or rtmps://.' };
  }
  if (!parsed.hostname) {
    return { valid: false, host: '', error: 'RTMP ingest URL must include a valid hostname.' };
  }

  return { valid: true, host: parsed.hostname };
}

export function buildRtmpTargetUri(target: SimulcastTargetInput, masked = false): string {
  const check = validateRtmpIngestUrl(target.ingestUrl);
  if (!check.valid) {
    throw new Error(check.error || 'Invalid RTMP ingest URL.');
  }
  const cleanKey = (target.streamKey || '').trim();
  if (!cleanKey || CONTROL_OR_SHELL_CHAR.test(cleanKey)) {
    throw new Error('Invalid stream key: must be non-empty without whitespace or shell characters.');
  }

  const base = target.ingestUrl.trim().replace(/\/+$/, '');
  const keySegment = masked ? maskStreamKey(cleanKey) : cleanKey;
  return `${base}/${keySegment}`;
}

export function buildFfmpegSimulcastArgs(options: {
  width?: number;
  height?: number;
  fps?: number;
  videoBitrateKbps?: number;
  audioBitrateKbps?: number;
  targets: SimulcastTargetInput[];
  maskKeys?: boolean;
}): string[] {
  const width = Math.max(640, Math.min(3840, Math.round(options.width ?? 1280)));
  const height = Math.max(360, Math.min(2160, Math.round(options.height ?? 720)));
  const fps = Math.max(15, Math.min(60, Math.round(options.fps ?? 30)));
  const videoBitrateKbps = Math.max(1000, Math.min(12000, Math.round(options.videoBitrateKbps ?? 4500)));
  const audioBitrateKbps = Math.max(64, Math.min(320, Math.round(options.audioBitrateKbps ?? 128)));

  const activeTargets = options.targets.filter((t) => t.enabled !== false);
  if (activeTargets.length === 0) {
    throw new Error('At least one enabled RTMP simulcast target is required.');
  }

  const teeEntries = activeTargets.map((t) => {
    const uri = buildRtmpTargetUri(t, options.maskKeys);
    return `[f=flv:onfail=ignore]${uri}`;
  });

  const baseArgs = [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-framerate', String(fps),
    '-i', 'pipe:0',
    '-f', 'lavfi',
    '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
    '-vf', `scale=${width}:${height}:flags=lanczos`,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-tune', 'zerolatency',
    '-pix_fmt', 'yuv420p',
    '-b:v', `${videoBitrateKbps}k`,
    '-maxrate', `${videoBitrateKbps}k`,
    '-bufsize', `${videoBitrateKbps * 2}k`,
    '-g', String(fps * 2),
    '-c:a', 'aac',
    '-b:a', `${audioBitrateKbps}k`,
    '-ar', '48000',
  ];

  if (teeEntries.length === 1) {
    const singleUri = buildRtmpTargetUri(activeTargets[0], options.maskKeys);
    return [...baseArgs, '-map', '0:v', '-map', '1:a', '-f', 'flv', singleUri];
  }

  return [
    ...baseArgs,
    '-map', '0:v',
    '-map', '1:a',
    '-f', 'tee',
    teeEntries.join('|'),
  ];
}

export function buildSimulcastWorkerSpec(params: {
  creatorSlug: string;
  creatorName: string;
  canonicalUrl: string;
  shortUrl?: string;
  targets: SimulcastTargetInput[];
  width?: number;
  height?: number;
  fps?: number;
}): SimulcastWorkerSpec {
  const width = Math.max(640, Math.min(3840, Math.round(params.width ?? 1280)));
  const height = Math.max(360, Math.min(2160, Math.round(params.height ?? 720)));
  const fps = Math.max(15, Math.min(60, Math.round(params.fps ?? 30)));

  const redactedTargets: RedactedSimulcastTarget[] = params.targets.map((t) => {
    const check = validateRtmpIngestUrl(t.ingestUrl);
    if (!check.valid) {
      throw new Error(check.error || 'Invalid RTMP ingest URL.');
    }
    return {
      platform: t.platform,
      ingestUrl: t.ingestUrl.trim(),
      rtmpHost: check.host,
      maskedKey: maskStreamKey(t.streamKey),
      enabled: t.enabled !== false,
    };
  });

  const baseUrl = params.canonicalUrl.replace(/\/+$/, '');
  const stageTargetUrl = baseUrl.includes('?')
    ? `${baseUrl}&simulcast=1`
    : `${baseUrl}?simulcast=1`;

  return {
    targetUrl: stageTargetUrl,
    viewport: { width, height, fps },
    targets: redactedTargets,
    overlay: {
      creatorSlug: params.creatorSlug,
      creatorName: params.creatorName,
      canonicalUrl: params.canonicalUrl,
      shortUrl: params.shortUrl || params.canonicalUrl,
      ctaLabel: `Play & Drop at ${params.shortUrl || params.canonicalUrl}`,
      splitBanner: '95% Direct to Creator • 5% Hub Infra',
    },
    ffmpegPreviewArgs: buildFfmpegSimulcastArgs({
      width,
      height,
      fps,
      targets: params.targets,
      maskKeys: true,
    }),
  };
}
