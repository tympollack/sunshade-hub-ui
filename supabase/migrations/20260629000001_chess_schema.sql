-- Create the new schema
create schema if not exists chess;

-- Grant schema privileges
grant usage on schema chess to anon, authenticated;
grant all privileges on schema chess to postgres, service_role;

-- Move game-specific tables to the new schema
alter table public.game_stats set schema chess;
alter table public.matches set schema chess;
alter table public.achievements set schema chess;
alter table public.user_achievements set schema chess;

-- Grant table privileges
grant all privileges on all tables in schema chess to postgres, service_role;
grant select, insert, update, delete on all tables in schema chess to anon, authenticated;
-- Note: Row Level Security policies were already created in the public schema and will move with the tables.

-- Ensure live match state broadcasts correctly to clients
alter publication supabase_realtime add table chess.matches;
