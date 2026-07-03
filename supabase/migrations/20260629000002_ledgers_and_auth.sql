-- 1. Move points_ledger to chess schema (idempotent)
do $$ begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'points_ledger') then
    alter table public.points_ledger set schema chess;
  end if;
end $$;

-- 2. Create Global Hub Tokens Ledger
do $$ begin
  create type public.hub_ledger_reason as enum ('daily_login', 'purchase', 'governance_reward');
exception when duplicate_object then null;
end $$;

create table if not exists public.hub_tokens_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  amount integer not null, 
  reason public.hub_ledger_reason not null,
  reference_id text,
  created_at timestamptz default now()
);

alter table public.hub_tokens_ledger enable row level security;
do $$ begin
  create policy "Users can view own hub tokens" on public.hub_tokens_ledger for select using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- 3. Automatic Profile Creation Trigger
-- Function that automatically executes when a new user signs up in auth.users
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created (idempotent)
do $$ begin
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();
exception when duplicate_object then null;
end $$;
