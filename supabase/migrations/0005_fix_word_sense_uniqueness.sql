alter table public.word_senses
  drop constraint if exists word_senses_word_pinyin_part_of_speech_unique;

create unique index if not exists word_senses_word_pinyin_pos_identity_idx
  on public.word_senses (
    word_id,
    lower(pinyin),
    coalesce(lower(part_of_speech), '')
  );
