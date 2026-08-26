'use server';

import { createSSRClient } from '../../../utils/supabase/server';

export interface UpdateProfileParams {
  displayName?: string;
  walletAddress?: string;
}

export interface UpdateProfileResult {
  success: boolean;
  message?: string;
  error?: string;
}

export async function updateCitizenProfile(params: UpdateProfileParams): Promise<UpdateProfileResult> {
  try {
    const supabase = await createSSRClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Unauthorized. Please sign in.' };
    }

    const updates: Record<string, any> = {};

    if (params.displayName !== undefined) {
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

    if (Object.keys(updates).length === 0) {
      return { success: true, message: 'No changes submitted.' };
    }

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

    return { success: true, message: 'Profile updated successfully.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}
