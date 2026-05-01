alter table public.tts_audio_cache
add column if not exists source_text text,
add column if not exists source_type text,
add column if not exists source_ref_id uuid,
add column if not exists source_metadata jsonb;

alter table public.tts_audio_cache
drop constraint if exists tts_audio_cache_source_type_check;

alter table public.tts_audio_cache
add constraint tts_audio_cache_source_type_check check (
  source_type is null
  or source_type in ('word', 'example', 'article', 'custom')
);

create index if not exists tts_audio_cache_source_type_idx
  on public.tts_audio_cache(source_type);

create index if not exists tts_audio_cache_source_ref_id_idx
  on public.tts_audio_cache(source_ref_id);
