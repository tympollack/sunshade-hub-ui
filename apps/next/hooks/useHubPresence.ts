import { useEffect, useState } from 'react';
import { supabase } from '@sunshade/supabase';

export function useHubPresence(userId?: string) {
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const channel = supabase.channel('sunshade_global_hub');

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        let count = 0;
        for (const id in state) {
          count += state[id].length;
        }
        setOnlineCount(count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && userId) {
          await channel.track({
            user: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { onlineCount };
}
