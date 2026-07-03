-- Dashboard live data tables
-- Extends profiles with hub token balance and cross-game ELO

-- 1. Add dashboard columns to profiles (idempotent)
alter table public.profiles
  add column if not exists global_hub_tokens integer not null default 0,
  add column if not exists critterverse_elo  integer not null default 1200;

-- 2. edge_nodes: devices/nodes registered to a user
create table if not exists public.edge_nodes (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  name       text        not null,
  status     text        not null default 'offline', -- 'online' | 'offline' | 'degraded'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.edge_nodes enable row level security;
do $$ begin
  create policy "Users read own edge_nodes"
    on public.edge_nodes for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Users manage own edge_nodes"
    on public.edge_nodes for all using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- 3. game_stats: per-game aggregated stats for a user
create table if not exists public.game_stats (
  id                   uuid        primary key default gen_random_uuid(),
  user_id              uuid        not null references public.profiles(id) on delete cascade,
  game_name            text        not null,
  matches_played       integer     not null default 0,
  win_rate             real        not null default 0.0,
  local_currency       integer     not null default 0,
  achievements_unlocked integer    not null default 0,
  achievements_total   integer     not null default 0,
  updated_at           timestamptz not null default now(),
  unique (user_id, game_name)
);

alter table public.game_stats enable row level security;
do $$ begin
  create policy "Users read own game_stats"
    on public.game_stats for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- 4. match_history: individual match records for a user
create table if not exists public.match_history (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  game_name     text        not null,
  opponent_name text        not null,
  result        text        not null, -- 'Victory' | 'Defeat' | 'Draw'
  match_type    text        not null default 'Standard',
  moves         integer     not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.match_history enable row level security;
do $$ begin
  create policy "Users read own match_history"
    on public.match_history for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- 5. ecosystem_logs: activity feed entries for a user
create table if not exists public.ecosystem_logs (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  event_category text        not null, -- 'achievement' | 'tokens' | 'node' | 'system'
  title          text        not null,
  description    text        not null default '',
  created_at     timestamptz not null default now()
);

alter table public.ecosystem_logs enable row level security;
do $$ begin
  create policy "Users read own ecosystem_logs"
    on public.ecosystem_logs for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
