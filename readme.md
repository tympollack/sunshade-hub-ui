# SunShade Hub UI

> Decentralized · Privacy-First · Sustainable Infrastructure

Cross-platform hub for the SunShade / Critterverse ecosystem. Built on a Solito monorepo (Expo + Next.js), deployed to Vercel, with background jobs triggered by cron-job.org and data stored in Supabase + Upstash Redis.

## Stack

| Layer | Technology |
|---|---|
| Web | Next.js 15 (App Router), deployed to Vercel |
| Mobile | Expo SDK 54, built with EAS |
| Shared UI | Solito + Moti + React Native Web |
| Database | Supabase (Postgres + Auth + RLS) |
| Cache / Queue | Upstash Redis (REST API) |
| Cron | cron-job.org → Vercel API routes |

## Folder layout

```
apps/
  expo/          React Native app (EAS build)
  next/          Next.js web app (Vercel)
    app/
      api/
        cron/
          worker/           Score rollup — drains Redis stream → leaderboard_entries
          leaderboard-reset/ Archive weekly/monthly leaderboard periods
          db-cleanup/        Purge expired rows across schemas
        events/             POST  Sync game events from client
        leaderboard/[scope] GET   Public leaderboard reads
        ledger/transaction/ POST  Idempotent currency transactions
        score/              POST  Queue score delta to Redis stream
      dashboard/            Dashboard page
      users/[userId]/       User profile page
    lib/
      supabase-server.ts    Service-role Supabase client
      redis.ts              Upstash Redis client
    utils/
      cron-auth.ts          Shared CRON_SECRET Bearer token verifier
      redis-lock.ts         Distributed Redis mutex (SET NX EX)

packages/
  app/                      Shared React Native / web components
    features/hub/           Hub UI screens and components
    provider/               Cross-platform providers
    navigation/             React Navigation config (native)

supabase/
  migrations/               Ordered SQL migrations
  functions/                Deno edge functions
```

## Environment variables

### Vercel

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `UPSTASH_REDIS_REST_URL` | Upstash REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST token |
| `CRON_SECRET` | Shared secret for cron route authorization |

### cron-job.org jobs

| Job | URL | Schedule |
|---|---|---|
| Score Rollup | `/api/cron/worker` | Every 15 min |
| Leaderboard Reset | `/api/cron/leaderboard-reset` | Daily 00:05 UTC |
| DB Cleanup | `/api/cron/db-cleanup` | Nightly |

All jobs POST with `Authorization: Bearer <CRON_SECRET>`.

## Local dev

```sh
# Install dependencies
yarn

# Next.js
yarn web

# Expo (after building a dev client via EAS)
yarn native
```

## EAS builds

```sh
cd apps/expo

# Development (APK / simulator)
eas build --profile development --platform android
eas build --profile development --platform ios

# Internal preview
eas build --profile preview --platform all

# Production
eas build --profile production --platform all
```

## Database migrations

```sh
# Apply all pending migrations to the linked Supabase project
supabase db push
```

## Key architectural notes

- `tsconfig.json` path alias must be `@app/*` not `app/*` — `app/*` shadows the Next.js App Router directory.
- Upstash Redis uses the REST client (`@upstash/redis`) with `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, not a TCP URL.
- The distributed Redis lock (`cron:global_critical_lock`) prevents `leaderboard-reset` and `db-cleanup` from running concurrently.
- Vercel root directory is set to `apps/next` in the Vercel dashboard project settings.
