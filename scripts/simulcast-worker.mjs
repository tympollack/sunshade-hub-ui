#!/usr/bin/env node
/**
 * Headless Chromium + FFmpeg RTMP Simulcast Worker (TASK-LIVE-SIMULCAST-RELAY)
 *
 * Captures the SunShade Live WebGL + Webcam PiP stage (`?simulcast=1` with Vanity Funnel Overlays)
 * using headless Chromium and pipes MJPEG frames into FFmpeg's RTMP/tee muxer.
 *
 * Usage:
 *   node scripts/simulcast-worker.mjs --url https://hub.sunshade.network/live/creator?simulcast=1 --rtmp rtmp://a.rtmp.youtube.com/live2/KEY
 */
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function parseWorkerArgs(argv = process.argv.slice(2)) {
  const config = {
    url: process.env.SIMULCAST_STAGE_URL || 'http://localhost:3000/live/studio?simulcast=1',
    rtmpTargets: [],
    width: Number(process.env.SIMULCAST_WIDTH || 1280),
    height: Number(process.env.SIMULCAST_HEIGHT || 720),
    fps: Number(process.env.SIMULCAST_FPS || 30),
    videoBitrateKbps: Number(process.env.SIMULCAST_VIDEO_KBPS || 4500),
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--url' && argv[i + 1]) {
      config.url = argv[++i];
    } else if (arg === '--rtmp' && argv[i + 1]) {
      config.rtmpTargets.push(argv[++i]);
    } else if (arg === '--width' && argv[i + 1]) {
      config.width = Number(argv[++i]);
    } else if (arg === '--height' && argv[i + 1]) {
      config.height = Number(argv[++i]);
    } else if (arg === '--fps' && argv[i + 1]) {
      config.fps = Number(argv[++i]);
    } else if (arg === '--dry-run') {
      config.dryRun = true;
    }
  }

  if (process.env.SIMULCAST_TARGETS_JSON) {
    try {
      const parsed = JSON.parse(process.env.SIMULCAST_TARGETS_JSON);
      if (Array.isArray(parsed)) {
        for (const t of parsed) {
          if (typeof t === 'string' && t.trim()) {
            config.rtmpTargets.push(t.trim());
          }
        }
      }
    } catch {
      throw new Error('Invalid SIMULCAST_TARGETS_JSON environment variable.');
    }
  }

  for (const target of config.rtmpTargets) {
    if (!/^rtmps?:\/\/\S+$/i.test(target)) {
      throw new Error(`Invalid RTMP target URI protocol: ${target.split('/').slice(0, 3).join('/')}`);
    }
  }

  return config;
}

export function buildWorkerFfmpegArgs(config) {
  if (!config.rtmpTargets || config.rtmpTargets.length === 0) {
    throw new Error('At least one --rtmp target URI is required.');
  }

  const base = [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-framerate', String(config.fps),
    '-i', 'pipe:0',
    '-f', 'lavfi',
    '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
    '-vf', `scale=${config.width}:${config.height}:flags=lanczos`,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-tune', 'zerolatency',
    '-pix_fmt', 'yuv420p',
    '-b:v', `${config.videoBitrateKbps}k`,
    '-maxrate', `${config.videoBitrateKbps}k`,
    '-bufsize', `${config.videoBitrateKbps * 2}k`,
    '-g', String(config.fps * 2),
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '48000',
    '-map', '0:v',
    '-map', '1:a',
  ];

  if (config.rtmpTargets.length === 1) {
    return [...base, '-f', 'flv', config.rtmpTargets[0]];
  }

  const teeSpec = config.rtmpTargets
    .map((uri) => `[f=flv:onfail=ignore]${uri}`)
    .join('|');
  return [...base, '-f', 'tee', teeSpec];
}

async function launchHeadlessBrowser() {
  for (const pkgName of ['playwright', 'puppeteer']) {
    try {
      const mod = await import(pkgName);
      if (pkgName === 'playwright' && mod.chromium) {
        const browser = await mod.chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
        });
        return { kind: 'playwright', browser };
      }
      if (pkgName === 'puppeteer' && (mod.default?.launch || mod.launch)) {
        const launcher = mod.default?.launch || mod.launch;
        const browser = await launcher({
          headless: true,
          args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
        });
        return { kind: 'puppeteer', browser };
      }
    } catch {
      // Try next browser driver
    }
  }
  throw new Error(
    'Headless Chromium driver not found. Install playwright or puppeteer on the simulcast relay host.'
  );
}

export async function runSimulcastWorker(argv = process.argv.slice(2)) {
  const config = parseWorkerArgs(argv);
  const ffmpegArgs = buildWorkerFfmpegArgs(config);

  if (config.dryRun) {
    console.log(JSON.stringify({ ok: true, dryRun: true, url: config.url, targetCount: config.rtmpTargets.length }));
    return;
  }

  const { kind, browser } = await launchHeadlessBrowser();
  const page = kind === 'playwright'
    ? await browser.newPage({ viewport: { width: config.width, height: config.height } })
    : await browser.newPage();

  if (kind === 'puppeteer') {
    await page.setViewport({ width: config.width, height: config.height });
  }

  await page.goto(config.url, { waitUntil: 'networkidle' });

  const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
    stdio: ['pipe', 'inherit', 'inherit'],
  });

  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    try {
      ffmpeg.stdin.end();
    } catch {}
    await browser.close().catch(() => {});
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  const frameIntervalMs = Math.max(16, Math.round(1000 / config.fps));

  while (!stopping && !ffmpeg.killed) {
    const frameStart = Date.now();
    const frameBuffer = await page.screenshot({ type: 'jpeg', quality: 85 });
    const canWrite = ffmpeg.stdin.write(frameBuffer);
    if (!canWrite) {
      await new Promise((resolve) => ffmpeg.stdin.once('drain', resolve));
    }
    const elapsed = Date.now() - frameStart;
    if (elapsed < frameIntervalMs) {
      await new Promise((resolve) => setTimeout(resolve, frameIntervalMs - elapsed));
    }
  }
}

const isCliEntry = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCliEntry) {
  runSimulcastWorker().catch((err) => {
    console.error('[simulcast-worker] Fatal error:', err.message);
    process.exit(1);
  });
}
