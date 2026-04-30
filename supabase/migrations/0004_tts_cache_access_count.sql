alter table public.tts_audio_cache
add column if not exists access_count integer not null default 0 check (access_count >= 0);

create index if not exists tts_audio_cache_last_accessed_at_idx
  on public.tts_audio_cache(last_accessed_at desc nulls last);
