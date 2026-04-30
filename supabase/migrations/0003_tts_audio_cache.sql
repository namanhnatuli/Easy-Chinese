-- ==========================================
-- 0003_TTS_AUDIO_CACHE.SQL
-- TTS cache foundation for cloud-generated pronunciation audio
-- ==========================================

insert into storage.buckets (id, name, public)
values ('tts-audio', 'tts-audio', true)
on conflict (id) do update
set public = excluded.public;

create table public.tts_audio_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null,
  provider text not null,
  voice text not null,
  language_code text not null,
  text_hash text not null,
  text_preview text not null,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  character_count integer not null check (character_count >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_accessed_at timestamptz,
  constraint tts_audio_cache_cache_key_unique unique (cache_key),
  constraint tts_audio_cache_provider_check check (provider in ('azure', 'google')),
  constraint tts_audio_cache_storage_bucket_check check (storage_bucket = 'tts-audio'),
  constraint tts_audio_cache_storage_path_unique unique (storage_bucket, storage_path),
  constraint tts_audio_cache_text_preview_length_check check (char_length(text_preview) <= 160),
  constraint tts_audio_cache_mime_type_check check (mime_type in ('audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'))
);

create index tts_audio_cache_cache_key_idx on public.tts_audio_cache(cache_key);
create index tts_audio_cache_language_code_idx on public.tts_audio_cache(language_code);
create index tts_audio_cache_provider_idx on public.tts_audio_cache(provider);
create index tts_audio_cache_created_at_idx on public.tts_audio_cache(created_at desc);

create trigger tts_audio_cache_set_updated_at
before update on public.tts_audio_cache
for each row execute function public.set_updated_at();

alter table public.tts_audio_cache enable row level security;

create policy "tts_audio_cache_read"
  on public.tts_audio_cache
  for select
  to public
  using (storage_bucket = 'tts-audio');

comment on table public.tts_audio_cache is
  'Metadata for cached TTS audio files stored in Supabase Storage. Rows are readable for public learning audio and writable only through service-role application code.';
