-- Add an explicit wins counter so win_rate can be recalculated exactly
-- (wins / matches_played) instead of reconstructed from a lossy rounded value.
alter table public.game_stats
  add column if not exists wins integer not null default 0;
