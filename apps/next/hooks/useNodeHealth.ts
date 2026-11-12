'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { NodeHealthResponse, NetworkMode, HealthStatus } from '../app/api/health/route';

export interface UseNodeHealthOptions {
  pollingIntervalMs?: number;
  enabled?: boolean;
}

export interface UseNodeHealthReturn {
  health: NodeHealthResponse | null;
  isLoading: boolean;
  error: Error | null;
  measuredPingMs: number | null;
  refetch: () => Promise<void>;
}

export const DEFAULT_POLLING_INTERVAL = 15000; // 15 seconds

export function useNodeHealth({
  pollingIntervalMs = DEFAULT_POLLING_INTERVAL,
  enabled = true,
}: UseNodeHealthOptions = {}): UseNodeHealthReturn {
  const [health, setHealth] = useState<NodeHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [measuredPingMs, setMeasuredPingMs] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const fetchHealth = useCallback(async () => {
    if (!enabled) return;

    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    try {
      const res = await fetch('/api/health', {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });

      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const roundTrip = Math.round(endTime - startTime);

      if (!res.ok) {
        throw new Error(`Health check failed with HTTP ${res.status}`);
      }

      const data: NodeHealthResponse = await res.json();

      if (isMountedRef.current) {
        setHealth(data);
        setMeasuredPingMs(data.latencyMs || roundTrip);
        setError(null);
        setIsLoading(false);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
        // Degraded / Air-Gapped fallback state
        setHealth((prev) => ({
          status: 'offline',
          mode: 'air-gapped',
          nodeId: prev?.nodeId || 'mesh-airgap-local',
          nodeIp: prev?.nodeIp || '127.0.0.1',
          latencyMs: 0,
          bandwidth: '0 Mbps (Air-Gapped)',
          hubVersion: prev?.hubVersion || 'v2.4.1-mesh',
          uptime: prev?.uptime || 'Local Mode',
          timestamp: new Date().toISOString(),
        }));
        setMeasuredPingMs(0);
        setIsLoading(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchHealth();

    const scheduleNext = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
          // Pause when tab is inactive
          return;
        }
        fetchHealth();
      }, pollingIntervalMs);
    };

    scheduleNext();

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        // Tab became active: trigger immediate check and refresh schedule
        fetchHealth();
        scheduleNext();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [fetchHealth, pollingIntervalMs]);

  return {
    health,
    isLoading,
    error,
    measuredPingMs,
    refetch: fetchHealth,
  };
}
