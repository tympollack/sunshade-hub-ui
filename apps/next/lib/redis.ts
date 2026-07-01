import { Redis } from '@upstash/redis';

/**
 * Upstash Redis client for Next.js API routes and cron jobs.
 * @upstash/redis uses HTTP REST — no persistent TCP connection,
 * which is correct for serverless functions.
 *
 * Set these env vars (copy from your Upstash dashboard → REST API tab):
 *   UPSTASH_REDIS_REST_URL    e.g. https://<host>.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN  your Upstash REST token
 */
export function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      'Missing env vars: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN'
    );
  }

  return new Redis({ url, token });
}

export const SCORE_EVENTS_STREAM = 'sunshade:score-events';
