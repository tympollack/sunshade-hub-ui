import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../app/api/broadcast/route';

vi.mock('../../../lib/supabase-server', () => ({
  getUserFromToken: vi.fn(),
  createServiceClient: vi.fn(),
}));

// Relative path mock from route location
vi.mock('../lib/supabase-server', () => ({
  getUserFromToken: vi.fn(),
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from '../lib/supabase-server';

describe('POST /api/broadcast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid action types', async () => {
    const req = new NextRequest('http://localhost:3000/api/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        action: 'invalid_action',
        enabledPlatforms: ['bluesky'],
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Invalid action');
  });

  it('rejects empty enabledPlatforms array', async () => {
    const req = new NextRequest('http://localhost:3000/api/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        action: 'queue',
        enabledPlatforms: [],
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('At least one social platform must be enabled');
  });

  it('rejects empty copy content', async () => {
    const req = new NextRequest('http://localhost:3000/api/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        action: 'queue',
        enabledPlatforms: ['bluesky'],
        body: '   ',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Broadcast copy content cannot be empty');
  });

  it('successfully persists queued broadcast post into hub_broadcasts', async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'bc-123', created_at: new Date().toISOString() },
          error: null,
        }),
      }),
    });

    (createServiceClient as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        action: 'queue',
        title: 'Network Deliberation Staging',
        body: 'Default body',
        overrides: {
          bluesky: { text: 'Custom Bluesky override' },
        },
        scheduledAt: '2026-11-20T12:00:00Z',
        enabledPlatforms: ['bluesky', 'x'],
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.broadcastId).toBe('bc-123');
    expect(data.action).toBe('queue');
    expect(data.enabledPlatforms).toEqual(['bluesky', 'x']);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Network Deliberation Staging',
        message: 'Custom Bluesky override',
      })
    );
  });

  it('returns 500 when database insertion fails', async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      }),
    });

    (createServiceClient as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        action: 'broadcast_now',
        title: 'Immediate Test',
        body: 'Immediate body',
        enabledPlatforms: ['bluesky'],
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toContain('Failed to persist broadcast: Database connection failed');
  });
});
