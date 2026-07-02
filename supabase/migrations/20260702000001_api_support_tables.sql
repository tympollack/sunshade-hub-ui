-- game_events: append-only event log synced from client devices
create table if not exists public.game_events (
  id           uuid        primary key default gen_random_uuid(),
  game_id      uuid        not null references public.hub_games(id) on delete cascade,
  profile_id   uuid        not null references public.profiles(id) on delete cascade,
  event_type   text        not null,
  payload      jsonb       not null default '{}'::jsonb,
  seq          bigint      not null,
  vector_clock jsonb       not null default '{}'::jsonb,
  synced       boolean     not null default true,
  created_at   timestamptz not null default now(),
  unique (game_id, profile_id, seq)
);

alter table public.game_events enable row level security;
create policy "Users read own game_events"
  on public.game_events for select using (auth.uid() = profile_id);
create policy "Users insert own game_events"
  on public.game_events for insert with check (auth.uid() = profile_id);

-- leaderboard_entries: live scores per (profile, scope, period)
create table if not exists public.leaderboard_entries (
  id          uuid        primary key default gen_random_uuid(),
  profile_id  uuid        not null references public.profiles(id) on delete cascade,
  scope       text        not null,
  period_type text        not null,
  period_key  text        not null,
  score       bigint      not null default 0,
  updated_at  timestamptz not null default now(),
  unique (profile_id, scope, period_type, period_key)
);

alter table public.leaderboard_entries enable row level security;
create policy "Public read leaderboard_entries"
  on public.leaderboard_entries for select to authenticated, anon using (true);

-- stream_offsets: tracks last-consumed Redis stream position per named stream
create table if not exists public.stream_offsets (
  stream_name text        primary key,
  last_id     text        not null default '0-0',
  updated_at  timestamptz not null default now()
);

alter table public.stream_offsets enable row level security;

-- apply_leaderboard_deltas: atomically upsert score deltas and advance stream offset
create or replace function public.apply_leaderboard_deltas(
  deltas        jsonb,
  p_stream_name text,
  p_last_id     text
)
returns void
language plpgsql
security definer
as $$
declare
  r jsonb;
begin
  for r in select * from jsonb_array_elements(deltas)
  loop
    insert into public.leaderboard_entries (profile_id, scope, period_type, period_key, score, updated_at)
    values (
      (r->>'profile_id')::uuid,
      r->>'scope',
      r->>'period_type',
      r->>'period_key',
      (r->>'delta')::bigint,
      now()
    )
    on conflict (profile_id, scope, period_type, period_key)
    do update set
      score      = leaderboard_entries.score + excluded.score,
      updated_at = now();
  end loop;

  insert into public.stream_offsets (stream_name, last_id, updated_at)
  values (p_stream_name, p_last_id, now())
  on conflict (stream_name)
  do update set last_id = excluded.last_id, updated_at = now();
end;
$$;
