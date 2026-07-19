'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@sunshade/supabase';

export function useHubPresence(userId?: string) {
  const [activeUsers, setActiveUsers] = useState<Record<string, any>>({});
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    // 1. Join the shared Hub Presence channel
    const channel = supabase.channel('sunshade_global_hub');

    channel
      .on('presence', { event: 'sync' }, () => {
        // 2. Sync fires whenever anyone joins or leaves
        const state = channel.presenceState();
        setActiveUsers(state);
        
        // Calculate total unique online users
        const count = Object.keys(state).length;
        setOnlineCount(count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // 3. Broadcast this user's state to everyone else
          await channel.track({ 
            user_id: userId, 
            status: 'online',
            current_app: 'hub_dashboard' 
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { activeUsers, onlineCount };
}
