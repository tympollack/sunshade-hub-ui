'use server';

import { createSSRClient } from '../../../utils/supabase/server';
import { revalidatePath } from 'next/cache';

export interface UpdateProfileParams {
  displayName?: string;
  walletAddress?: string;
  avatarUrl?: string | null;
}

export interface UpdateProfileResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    display_name?: string;
    wallet_address?: string | null;
    avatar_url?: string | null;
  };
}

function isValidAvatarUrl(urlStr: string): boolean {
  if (typeof urlStr !== 'string' || !urlStr.trim()) return false;
  if (/^data:image\/(jpeg|png|webp|gif|avif);base64,[A-Za-z0-9+/=]+$/.test(urlStr)) {
    return true;
  }
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'assets.sunshade.icu' ||
      hostname.endsWith('.sunshade.icu') ||
      hostname.endsWith('.supabase.co')
    ) {
      return true;
    }
  } catch (_) {
    return false;
  }
  return false;
}

export async function updateCitizenProfile(params: UpdateProfileParams): Promise<UpdateProfileResult> {
  try {
    const supabase = await createSSRClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized. Please sign in.' };
    }

    const updates: Record<string, any> = {};

    if (params.displayName !== undefined && params.displayName !== '') {
      const trimmed = params.displayName.trim();
      if (trimmed.length < 2) {
        return { success: false, error: 'Display name must be at least 2 characters.' };
      }
      if (trimmed.length > 32) {
        return { success: false, error: 'Display name cannot exceed 32 characters.' };
      }
      updates.display_name = trimmed;
    }

    if (params.walletAddress !== undefined) {
      const trimmed = params.walletAddress.trim();
      if (trimmed.length > 0) {
        if (!/^(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})$/.test(trimmed)) {
          return { success: false, error: 'Invalid wallet address format (Ethereum 0x... or Solana base58 expected).' };
        }
        updates.wallet_address = trimmed;
      } else {
        updates.wallet_address = null;
      }
    }

    if (params.avatarUrl !== undefined) {
      if (params.avatarUrl !== null && !isValidAvatarUrl(params.avatarUrl)) {
        return { success: false, error: 'Invalid avatar URL format or origin.' };
      }

      await supabase.auth.updateUser({
        data: { avatar_url: params.avatarUrl },
      });
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) {
        if (updateError.code === '23505') {
          return { success: false, error: 'This wallet address is already linked to another citizen account.' };
        }
        return { success: false, error: updateError.message || 'Failed to update profile.' };
      }
    }

    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Profile updated successfully.',
      data: {
        display_name: updates.display_name,
        wallet_address: updates.wallet_address,
        avatar_url: params.avatarUrl,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}
