create table public.user_word_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  ease_factor numeric(4,2) not null default 2.50,
  interval integer not null default 1 check (interval >= 1),
  repetition_count integer not null default 0 check (repetition_count >= 0),
  next_review_at timestamptz,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_word_memory_user_word_unique unique (user_id, word_id)
);

create table public.user_learning_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  streak_count integer not null default 0 check (streak_count >= 0),
  last_active_date date,
  daily_goal integer not null default 10 check (daily_goal >= 1 and daily_goal <= 500),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index user_word_memory_user_next_review_idx
  on public.user_word_memory(user_id, next_review_at asc);

create index user_word_memory_user_repetition_idx
  on public.user_word_memory(user_id, repetition_count desc);

create index user_word_memory_word_id_idx
  on public.user_word_memory(word_id);

create trigger user_word_memory_set_updated_at
before update on public.user_word_memory
for each row execute function public.set_updated_at();

create trigger user_learning_stats_set_updated_at
before update on public.user_learning_stats
for each row execute function public.set_updated_at();

alter table public.user_word_memory enable row level security;
alter table public.user_learning_stats enable row level security;

create policy "user_word_memory_own"
on public.user_word_memory
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_learning_stats_own"
on public.user_learning_stats
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
