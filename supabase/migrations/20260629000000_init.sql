-- 1. Core Identity
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  wallet_address text unique, -- For decentralized identity mapping
  reputation_score integer default 0,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Public read profiles" on profiles for select using (true);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);

-- 2. Game-Specific Identity & Stats
create table if not exists game_stats (
  user_id uuid primary key references profiles(id) on delete cascade,
  gamer_tag text not null unique,
  elo_standard integer default 1200,
  elo_960 integer default 1200,
  created_at timestamptz default now()
);

alter table game_stats enable row level security;
create policy "Public read game stats" on game_stats for select using (true);

-- 3. Append-Only Points Ledger (Currency)
create type ledger_reason as enum ('match_win', 'achievement', 'daily_login', 'purchase');

create table if not exists points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  amount integer not null, 
  reason ledger_reason not null,
  reference_id text,
  created_at timestamptz default now()
);

alter table points_ledger enable row level security;
create policy "Users can view own ledger" on points_ledger for select using (auth.uid() = user_id);

-- 4. Hub Chat
create table if not exists hub_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references profiles(id) on delete cascade,
  channel_id text not null,
  content text not null,
  created_at timestamptz default now()
);

alter table hub_messages enable row level security;
create policy "Public read messages" on hub_messages for select using (true);
create policy "Users insert own messages" on hub_messages for insert with check (auth.uid() = sender_id);

-- 5. Match Engine Ledger
create type match_status as enum ('pending', 'active', 'completed', 'aborted');

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  status match_status default 'pending',
  player_white_id uuid references profiles(id),
  player_black_id uuid references profiles(id),
  initial_fen text not null,
  move_history jsonb default '[]'::jsonb,
  winner_id uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table matches enable row level security;
create policy "Public read matches" on matches for select using (true);

-- 6. Gamification (Achievements)
create table if not exists achievements (
  id text primary key,
  name text not null,
  description text not null,
  reward_points integer default 0
);

alter table achievements enable row level security;
create policy "Public read achievements" on achievements for select using (true);

create table if not exists user_achievements (
  user_id uuid references profiles(id) on delete cascade,
  achievement_id text references achievements(id) on delete cascade,
  unlocked_at timestamptz default now(),
  primary key (user_id, achievement_id)
);

alter table user_achievements enable row level security;
create policy "Public read user_achievements" on user_achievements for select using (true);

-- Note: Community Poll tables from previous iteration removed for brevity in this gaming-focused update, 
-- but would normally exist alongside these tables.
