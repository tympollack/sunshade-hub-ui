#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import {
  runAudit,
  formatAuditReport,
  parseViewports,
} from '@digitalcanopy/ui/audit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const REPO_ROOT = path.resolve(__dirname, '..');
export const NEXT_APP_DIR = path.join(REPO_ROOT, 'apps', 'next');

export const DEFAULT_HUB_AUDIT_ROUTES = [
  '/login',
  '/claim',
  '/forgot-password',
  '/reset-password',
  '/verify',
  '/live',
  '/dashboard',
];

export const DEFAULT_VIEWPORTS = 'mobile:375x667,desktop:1280x800';
export const DEFAULT_PORT = 3105;

/**
 * @param {Record<string, string | undefined>} [env]
 * @returns {Record<string, string | undefined>}
 */
export function ensureAuditEnv(env = process.env) {
  if (env.SUNSHADE_AUDIT_LIVE === '1') {
    return {
      ...env,
      NEXT_PUBLIC_SUPABASE_URL:
        env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIn0.dummy',
    };
  }
  return {
    ...env,
    NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIn0.dummy',
  };
}

/**
 * @param {string[]} argv
 * @param {Record<string, string | undefined>} [env]
 */
export function parseDodUiArgs(argv, env = process.env) {
  let url = env.SUNSHADE_AUDIT_URL || '';
  let routesRaw = env.SUNSHADE_AUDIT_ROUTES || DEFAULT_HUB_AUDIT_ROUTES.join(',');
  let viewportsRaw = env.SUNSHADE_AUDIT_VIEWPORTS || DEFAULT_VIEWPORTS;
  let json = env.SUNSHADE_AUDIT_JSON === '1' || env.SUNSHADE_AUDIT_JSON === 'true';
  let timeoutMs = env.SUNSHADE_AUDIT_TIMEOUT ? Number(env.SUNSHADE_AUDIT_TIMEOUT) : 20000;
  let executablePath = env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  let port = env.SUNSHADE_AUDIT_PORT ? Number(env.SUNSHADE_AUDIT_PORT) : DEFAULT_PORT;
  let skipBuild = env.SUNSHADE_AUDIT_SKIP_BUILD === '1' || env.SUNSHADE_AUDIT_SKIP_BUILD === 'true';
  let help = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === '--json') {
      json = true;
    } else if (arg === '--skip-build') {
      skipBuild = true;
    } else if (arg.startsWith('--url=')) {
      url = arg.slice('--url='.length);
    } else if (arg === '--url' && argv[i + 1]) {
      url = argv[++i];
    } else if (arg.startsWith('--routes=')) {
      routesRaw = arg.slice('--routes='.length);
    } else if (arg === '--routes' && argv[i + 1]) {
      routesRaw = argv[++i];
    } else if (arg.startsWith('--viewports=')) {
      viewportsRaw = arg.slice('--viewports='.length);
    } else if (arg === '--viewports' && argv[i + 1]) {
      viewportsRaw = argv[++i];
    } else if (arg.startsWith('--timeout=')) {
      timeoutMs = Number(arg.slice('--timeout='.length));
    } else if (arg === '--timeout' && argv[i + 1]) {
      timeoutMs = Number(argv[++i]);
    } else if (arg.startsWith('--port=')) {
      port = Number(arg.slice('--port='.length));
    } else if (arg === '--port' && argv[i + 1]) {
      port = Number(argv[++i]);
    } else if (arg.startsWith('--executable-path=')) {
      executablePath = arg.slice('--executable-path='.length);
    } else if (arg === '--executable-path' && argv[i + 1]) {
      executablePath = argv[++i];
    }
  }

  const routes = routesRaw
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => (r.startsWith('/') || r.startsWith('http') ? r : `/${r}`));

  if (routes.length === 0) {
    throw new Error('At least one route must be specified for dod:ui.');
  }

  const resolvedPort = Number.isFinite(port) && port > 0 ? port : DEFAULT_PORT;

  return {
    url: url ? url.replace(/\/+$/, '') : '',
    routes,
    viewports: parseViewports(viewportsRaw),
    json,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 20000,
    executablePath,
    port: resolvedPort,
    skipBuild,
    help,
  };
}

function resolveNextBinPath() {
  const candidates = [
    path.join(REPO_ROOT, 'node_modules', 'next', 'dist', 'bin', 'next'),
    path.join(NEXT_APP_DIR, 'node_modules', 'next', 'dist', 'bin', 'next'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error('Unable to locate Next.js CLI binary in node_modules/next/dist/bin/next.');
}

function runProcess(cmd, args, cwd, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      env,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command "${cmd} ${args.join(' ')}" exited with code ${code}`));
      }
    });
  });
}

async function waitForServerReady(baseUrl, child, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  const probeUrl = `${baseUrl}/api/health`;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Next.js server exited prematurely with code ${child.exitCode}`);
    }
    try {
      const res = await fetch(probeUrl);
      if (res.status < 500) {
        return;
      }
    } catch {
      // Server still booting
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  throw new Error(`Timed out waiting for Next.js server at ${probeUrl}`);
}

function printHelp() {
  console.log(`dod:ui - SunShade Hub Playwright + axe-core Layout & Accessibility Audit

Usage:
  npm run dod:ui [-- options]

Options:
  --url <url>               Audit an already-running server instead of booting Next.js
  --routes <r1,r2>          Comma-separated routes (default: ${DEFAULT_HUB_AUDIT_ROUTES.join(',')})
  --viewports <specs>       Viewport list (default: ${DEFAULT_VIEWPORTS})
  --port <port>             Local Next.js start port (default: ${DEFAULT_PORT})
  --skip-build              Skip running next build even if .next is stale
  --timeout <ms>            Navigation timeout per route in ms (default: 20000)
  --executable-path <path>  Optional Chromium executable path
  --json                    Output structured JSON audit report
  -h, --help                Show help`);
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseDodUiArgs(argv);
  if (options.help) {
    printHelp();
    return 0;
  }

  const env = ensureAuditEnv();
  let targetUrl = options.url;
  let serverProcess = null;

  try {
    if (!targetUrl) {
      const nextBin = resolveNextBinPath();
      const buildIdPath = path.join(NEXT_APP_DIR, '.next', 'BUILD_ID');
      if (!options.skipBuild || !fs.existsSync(buildIdPath)) {
        console.log('[dod:ui] Building Next.js production bundle for audit...');
        await runProcess(process.execPath, [nextBin, 'build'], NEXT_APP_DIR, env);
      }

      targetUrl = `http://127.0.0.1:${options.port}`;
      console.log(`[dod:ui] Starting Next.js server at ${targetUrl}...`);
      serverProcess = spawn(
        process.execPath,
        [nextBin, 'start', '-p', String(options.port), '-H', '127.0.0.1'],
        {
          cwd: NEXT_APP_DIR,
          env,
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );

      let stderrTail = '';
      serverProcess.stderr?.on('data', (chunk) => {
        stderrTail = (stderrTail + chunk.toString()).slice(-2000);
      });

      try {
        await waitForServerReady(targetUrl, serverProcess);
      } catch (err) {
        if (stderrTail) {
          console.error(`[dod:ui] Next.js server stderr:\n${stderrTail}`);
        }
        throw err;
      }
    }

    const report = await runAudit({
      url: targetUrl,
      routes: options.routes,
      viewports: options.viewports,
      json: options.json,
      timeoutMs: options.timeoutMs,
      executablePath: options.executablePath,
    });

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatAuditReport(report));
    }

    return report.passed ? 0 : 1;
  } finally {
    if (serverProcess && serverProcess.exitCode === null) {
      serverProcess.kill('SIGTERM');
    }
  }
}

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isMainModule) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      console.error(`[dod:ui] Fatal error: ${err instanceof Error ? err.message : String(err)}`);
      process.exitCode = 1;
    });
}
