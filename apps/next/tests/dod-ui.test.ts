import { describe, it, expect } from 'vitest';
import {
  DEFAULT_HUB_AUDIT_ROUTES,
  DEFAULT_PORT,
  DEFAULT_VIEWPORTS,
  ensureAuditEnv,
  parseDodUiArgs,
} from '../../../scripts/dod-ui.mjs';

describe('dod:ui Playwright + axe-core Audit Suite Configuration', () => {
  it('defaults to all core Hub routes and mobile/desktop viewports', () => {
    const parsed = parseDodUiArgs([], {});
    expect(parsed.routes).toEqual(DEFAULT_HUB_AUDIT_ROUTES);
    expect(parsed.routes).toContain('/login');
    expect(parsed.routes).toContain('/dashboard');
    expect(parsed.routes).toContain('/live');
    expect(parsed.routes).toContain('/verify');
    expect(parsed.viewports).toEqual([
      { name: 'mobile', width: 375, height: 667 },
      { name: 'desktop', width: 1280, height: 800 },
    ]);
    expect(parsed.port).toBe(DEFAULT_PORT);
    expect(parsed.skipBuild).toBe(false);
    expect(DEFAULT_VIEWPORTS).toBe('mobile:375x667,desktop:1280x800');
  });

  it('supports custom --url, --routes, --viewports, --skip-build, and --json flags', () => {
    const parsed = parseDodUiArgs(
      [
        '--url',
        'http://127.0.0.1:4000/',
        '--routes',
        '/login,dashboard',
        '--viewports',
        'mobile:375x667',
        '--skip-build',
        '--json',
        '--port=3200',
      ],
      {}
    );
    expect(parsed.url).toBe('http://127.0.0.1:4000');
    expect(parsed.routes).toEqual(['/login', '/dashboard']);
    expect(parsed.viewports).toEqual([{ name: 'mobile', width: 375, height: 667 }]);
    expect(parsed.skipBuild).toBe(true);
    expect(parsed.json).toBe(true);
    expect(parsed.port).toBe(3200);
  });

  it('uses deterministic placeholder Supabase env vars by default unless SUNSHADE_AUDIT_LIVE=1', () => {
    const cleanEnv = ensureAuditEnv({});
    expect(cleanEnv.NEXT_PUBLIC_SUPABASE_URL).toBe('https://placeholder.supabase.co');
    expect(cleanEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeTruthy();

    const liveEnv = ensureAuditEnv({
      SUNSHADE_AUDIT_LIVE: '1',
      NEXT_PUBLIC_SUPABASE_URL: 'https://custom-stag.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'custom-anon-key',
    });
    expect(liveEnv.NEXT_PUBLIC_SUPABASE_URL).toBe('https://custom-stag.supabase.co');
    expect(liveEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('custom-anon-key');
  });
});
