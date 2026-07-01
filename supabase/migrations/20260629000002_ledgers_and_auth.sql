-- 1. Move points_ledger to chess schema
alter table public.points_ledger set schema chess;

-- 2. Create Global Hub Tokens Ledger
create type public.hub_ledger_reason as enum ('daily_login', 'purchase', 'governance_reward');

create table if not exists public.hub_tokens_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  amount integer not null, 
  reason public.hub_ledger_reason not null,
  reference_id text,
  created_at timestamptz default now()
);

alter table public.hub_tokens_ledger enable row level security;
create policy "Users can view own hub tokens" on public.hub_tokens_ledger for select using (auth.uid() = user_id);

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

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
