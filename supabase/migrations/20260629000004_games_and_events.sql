create table if not exists public.hub_games (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  deep_link_scheme text,
  web_fallback_url text,
  created_at timestamptz default now()
);

create table if not exists public.hub_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.hub_games(id),
  title text not null,
  description text,
  image_url text,
  start_time timestamptz not null default now(),
  end_time timestamptz not null,
  call_to_action_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.hub_games enable row level security;
alter table public.hub_events enable row level security;

-- Public read access
do $$ begin
  create policy "Allow public read access on hub_games" on public.hub_games for select to authenticated, anon using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Allow public read access on hub_events" on public.hub_events for select to authenticated, anon using (true);
exception when duplicate_object then null;
end $$;

-- Seed Data for SunShade Chess
insert into public.hub_games (id, title, description, deep_link_scheme, web_fallback_url)
values (
  '11111111-1111-1111-1111-111111111111', 
  'SunShade Chess', 
  'A strategic cross-platform chess game in the Critterverse ecosystem.', 
  'sunshade-chess',
  'https://chess.sunshade.network'
) on conflict (id) do nothing;
