import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateCitizenProfile } from '../app/dashboard/actions/profile-actions';

// Mock Supabase server client
const mockGetUser = vi.fn();
const mockUpdateUser = vi.fn();
const mockProfilesUpdate = vi.fn();
const mockProfilesEq = vi.fn();

vi.mock('../utils/supabase/server', () => ({
  createSSRClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: mockGetUser,
      updateUser: mockUpdateUser,
    },
    from: vi.fn().mockImplementation((table: string) => ({
      update: mockProfilesUpdate.mockReturnValue({
        eq: mockProfilesEq,
      }),
    })),
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('updateCitizenProfile Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-abc-123', email: 'citizen@sunshade.icu' } },
      error: null,
    });
    mockProfilesEq.mockResolvedValue({ error: null });
    mockUpdateUser.mockResolvedValue({ data: {}, error: null });
  });

  it('rejects display name shorter than 2 characters', async () => {
    const res = await updateCitizenProfile({ displayName: 'A' });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/at least 2 characters/i);
  });

  it('rejects display name longer than 32 characters', async () => {
    const res = await updateCitizenProfile({ displayName: 'A'.repeat(33) });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/cannot exceed 32 characters/i);
  });

  it('rejects invalid wallet address format', async () => {
    const res = await updateCitizenProfile({ walletAddress: 'invalid-wallet-format' });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Invalid wallet address format/i);
  });

  it('accepts valid Ethereum 0x wallet address', async () => {
    const validEth = '0x1234567890abcdef1234567890abcdef12345678';
    const res = await updateCitizenProfile({ walletAddress: validEth });
    expect(res.success).toBe(true);
    expect(res.data?.wallet_address).toBe(validEth);
  });

  it('rejects untrusted or malicious avatar URLs', async () => {
    const res = await updateCitizenProfile({
      avatarUrl: 'https://evil-site.com/avatar.png',
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Invalid avatar URL format or origin/i);
  });

  it('accepts trusted SunShade and Supabase avatar URLs', async () => {
    const res = await updateCitizenProfile({
      avatarUrl: 'https://assets.sunshade.icu/avatars/user-123.png',
    });
    expect(res.success).toBe(true);
    expect(res.data?.avatar_url).toBe('https://assets.sunshade.icu/avatars/user-123.png');
  });

  it('accepts valid base64 data URIs for avatar', async () => {
    const validDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const res = await updateCitizenProfile({
      avatarUrl: validDataUrl,
    });
    expect(res.success).toBe(true);
    expect(res.data?.avatar_url).toBe(validDataUrl);
  });

  it('handles avatar removal with null avatarUrl without requiring displayName', async () => {
    const res = await updateCitizenProfile({
      avatarUrl: null,
    });
    expect(res.success).toBe(true);
    expect(mockUpdateUser).toHaveBeenCalledWith({
      data: { avatar_url: null },
    });
  });
});
