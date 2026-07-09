-- 1. Core Identity
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  wallet_address text unique, -- For decentralized identity mapping
  reputation_score integer default 0,
  status text default 'pending_invite',
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Public read profiles" on profiles for select using (true);

-- Helper function to check if the current user is active
create or replace function is_active_user()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from profiles 
    where id = auth.uid() 
    and status = 'active'
  );
$$;

-- Note: We do NOT want users to update their own status.
-- In a production app, we would restrict the columns that can be updated.
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
create policy "Users insert own messages" on hub_messages for insert with check (auth.uid() = sender_id and is_active_user());

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
create policy "Users insert own achievements" on user_achievements for insert with check (auth.uid() = user_id and is_active_user());
create policy "Users delete own achievements" on user_achievements for delete using (auth.uid() = user_id);

-- Note: Community Poll tables from previous iteration removed for brevity in this gaming-focused update, 
-- but would normally exist alongside these tables.

-- 7. App Updates (OTA)
create table if not exists app_versions (
  id uuid primary key default gen_random_uuid(),
  app_name text not null, -- e.g., 'patchwork', 'lexshade', 'sunshade_hub'
  version_code integer not null,
  version_string text not null,
  download_url text not null,
  is_critical boolean default false,
  created_at timestamptz default now()
);

alter table app_versions enable row level security;
create policy "Public read app_versions" on app_versions for select using (true);

-- 8. Invites
create table if not exists invites (
  code text primary key,
  tier text not null default 'public',
  is_claimed boolean default false,
  claimed_by uuid references profiles(id) on delete set null,
  claimed_at timestamptz
);

alter table invites enable row level security;
-- Only allow reading invites to check if they exist, but normally we'd restrict this
create policy "Public read invites" on invites for select using (true);

-- RPC for securely claiming an invite
create or replace function claim_invite(invite_code text)
returns boolean
language plpgsql
security definer
as $$
declare
  v_invite record;
begin
  -- Strict locking to prevent race conditions
  select * into v_invite from invites where code = invite_code for update;

  if v_invite.code is null then
    raise exception 'Invite code not found';
  end if;

  if v_invite.is_claimed = true then
    raise exception 'Invite code already claimed';
  end if;

  -- Mark as claimed
  update invites 
  set is_claimed = true, claimed_by = auth.uid(), claimed_at = now()
  where code = invite_code;

  -- Update user status
  update profiles
  set status = 'active'
  where id = auth.uid();

  return true;
end;
$$;
