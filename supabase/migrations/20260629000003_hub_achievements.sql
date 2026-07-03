-- Global Hub Achievements
create table if not exists public.hub_achievements (
  id text primary key,
  name text not null,
  description text not null,
  reward_tokens integer default 0
);

alter table public.hub_achievements enable row level security;
do $$ begin
  create policy "Public read hub achievements" on public.hub_achievements for select using (true);
exception when duplicate_object then null;
end $$;

create table if not exists public.user_hub_achievements (
  user_id uuid references public.profiles(id) on delete cascade,
  achievement_id text references public.hub_achievements(id) on delete cascade,
  unlocked_at timestamptz default now(),
  primary key (user_id, achievement_id)
);

alter table public.user_hub_achievements enable row level security;
do $$ begin
  create policy "Public read user_hub_achievements" on public.user_hub_achievements for select using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Users can manage own hub achievements for dev" on public.user_hub_achievements for all using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- Also add a policy for chess achievements so we can toggle them from the UI
do $$ begin
  create policy "Users can manage own chess achievements for dev" on chess.user_achievements for all using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
