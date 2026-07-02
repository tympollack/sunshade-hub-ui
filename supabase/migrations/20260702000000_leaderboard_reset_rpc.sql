-- process_leaderboard_reset(p_period_type, p_period_key)
-- Archives the top-N leaderboard entries for the completed period into
-- leaderboard_history, then deletes the live rows for that period.
-- Idempotent: safe to call multiple times for the same period.

create or replace function public.process_leaderboard_reset(
  p_period_type text,
  p_period_key  text
)
returns void
language plpgsql
security definer
as $$
begin
  -- Archive top entries for the completed period (skip if already archived)
  insert into public.leaderboard_history (
    profile_id,
    scope,
    period_type,
    period_key,
    score,
    rank,
    archived_at
  )
  select
    profile_id,
    scope,
    period_type,
    period_key,
    score,
    row_number() over (partition by scope order by score desc) as rank,
    now()
  from public.leaderboard_entries
  where period_type = p_period_type
    and period_key  = p_period_key
  on conflict (profile_id, scope, period_type, period_key) do nothing;

  -- Remove the live rows for the completed period
  delete from public.leaderboard_entries
  where period_type = p_period_type
    and period_key  = p_period_key;
end;
$$;

-- leaderboard_history table (created here if it doesn't exist yet)
create table if not exists public.leaderboard_history (
  id          uuid        primary key default gen_random_uuid(),
  profile_id  uuid        not null references public.profiles(id) on delete cascade,
  scope       text        not null,
  period_type text        not null,
  period_key  text        not null,
  score       bigint      not null default 0,
  rank        int         not null,
  archived_at timestamptz not null default now(),
  unique (profile_id, scope, period_type, period_key)
);

alter table public.leaderboard_history enable row level security;
create policy "Public read on leaderboard_history"
  on public.leaderboard_history for select to authenticated, anon using (true);
