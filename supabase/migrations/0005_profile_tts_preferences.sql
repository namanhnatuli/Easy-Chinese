alter table public.profiles
  add column preferred_tts_provider text not null default 'azure',
  add column preferred_tts_voice text;

alter table public.profiles
  add constraint profiles_preferred_tts_provider_check
  check (preferred_tts_provider in ('azure', 'google'));
