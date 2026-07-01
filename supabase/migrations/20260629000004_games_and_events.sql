create table public.hub_games (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  deep_link_scheme text,
  web_fallback_url text,
  created_at timestamptz default now()
);

create table public.hub_events (
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
create policy "Allow public read access on hub_games" on public.hub_games for select to authenticated, anon using (true);
create policy "Allow public read access on hub_events" on public.hub_events for select to authenticated, anon using (true);

-- Seed Data for SunShade Chess
insert into public.hub_games (id, title, description, deep_link_scheme, web_fallback_url)
values (
  '11111111-1111-1111-1111-111111111111', 
  'SunShade Chess', 
  'A strategic cross-platform chess game in the Critterverse ecosystem.', 
  'sunshade-chess',
  'https://chess.sunshade.network'
);

insert into public.hub_events (game_id, title, description, start_time, end_time, is_active)
values (
  '11111111-1111-1111-1111-111111111111', 
  'Double CP Weekend', 
  'Earn double the Critterverse Points (CP) for every ranked match won this weekend!', 
  now(), 
  now() + interval '3 days',
  true
);

insert into public.hub_events (game_id, title, description, start_time, end_time, is_active)
values (
  '11111111-1111-1111-1111-111111111111', 
  'Grandmaster Tournament', 
  'Watch the top 8 players battle for 100,000 HT. Tune in live!', 
  now() + interval '1 day', 
  now() + interval '2 days',
  true
);
