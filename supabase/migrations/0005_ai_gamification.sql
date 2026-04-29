create table public.user_xp (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  total_xp integer not null default 0 check (total_xp >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_level (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  level integer not null default 1 check (level >= 1),
  current_xp integer not null default 0 check (current_xp >= 0),
  next_level_xp integer not null default 100 check (next_level_xp > current_xp),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_key text not null,
  earned_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_achievements_unique unique (user_id, achievement_key)
);

create table public.user_xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_key text not null,
  reason text not null,
  amount integer not null check (amount >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  constraint user_xp_events_unique unique (user_id, source_key)
);

create index user_xp_total_xp_idx
  on public.user_xp(total_xp desc);

create index user_level_level_idx
  on public.user_level(level desc);

create index user_achievements_user_earned_at_idx
  on public.user_achievements(user_id, earned_at desc);

create index user_achievements_key_idx
  on public.user_achievements(achievement_key);

create index user_xp_events_user_created_at_idx
  on public.user_xp_events(user_id, created_at desc);

create trigger user_xp_set_updated_at
before update on public.user_xp
for each row execute function public.set_updated_at();

create trigger user_level_set_updated_at
before update on public.user_level
for each row execute function public.set_updated_at();

create trigger user_achievements_set_updated_at
before update on public.user_achievements
for each row execute function public.set_updated_at();

alter table public.user_xp enable row level security;
alter table public.user_level enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_xp_events enable row level security;

create policy "user_xp_own"
on public.user_xp
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_level_own"
on public.user_level
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_achievements_own"
on public.user_achievements
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_xp_events_own"
on public.user_xp_events
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
