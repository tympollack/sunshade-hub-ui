import { getRedis } from '../lib/redis';

/**
 * Attempts to acquire a distributed Redis mutex using SET NX EX.
 * Returns the lock token (a unique string) if acquired, or null if the lock
 * is already held by another process.
 *
 * @param key     Redis key for the lock, e.g. "cron:global_critical_lock"
 * @param ttlSecs How long the lock is held before auto-expiring (safety net
 *                in case the holder crashes before calling releaseLock).
 */
export async function acquireLock(key: string, ttlSecs: number): Promise<string | null> {
  const redis = getRedis();
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // SET key token NX EX ttlSecs — only sets if key does not exist
  const result = await redis.set(key, token, { nx: true, ex: ttlSecs });

  return result === 'OK' ? token : null;
}

/**
 * Releases the lock only if the caller still owns it (token matches).
 * Uses a Lua script for atomic check-and-delete to prevent a slow job from
 * accidentally releasing a lock re-acquired by a newer process.
 *
 * @param key   Redis key for the lock
 * @param token The token returned by acquireLock
 */
export async function releaseLock(key: string, token: string): Promise<void> {
  const redis = getRedis();

  // Lua: delete only if the stored value matches our token
  const script = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;

  await redis.eval(script, [key], [token]);
}
