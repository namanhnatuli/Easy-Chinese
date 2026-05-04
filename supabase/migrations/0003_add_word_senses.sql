create table public.word_senses (
  id uuid primary key default gen_random_uuid(),
  word_id uuid not null references public.words(id) on delete cascade,
  slug text,
  pinyin text not null,
  pinyin_plain text,
  pinyin_numbered text,
  part_of_speech text,
  meaning_vi text not null,
  meaning_en text,
  usage_note text,
  grammar_role text,
  common_collocations jsonb,
  sense_order integer not null default 1 check (sense_order >= 1),
  is_primary boolean not null default false,
  source_confidence public.source_confidence_level,
  review_status public.vocab_review_status not null default 'approved',
  content_hash text,
  is_published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint word_senses_word_pinyin_part_of_speech_unique unique (word_id, pinyin, part_of_speech)
);

alter table public.word_examples
  add column sense_id uuid references public.word_senses(id) on delete set null;

create index word_senses_word_id_idx on public.word_senses(word_id);
create index word_senses_word_pinyin_idx on public.word_senses(word_id, pinyin);
create index word_senses_word_order_idx on public.word_senses(word_id, sense_order);
create index word_examples_sense_id_idx on public.word_examples(sense_id);

insert into public.word_senses (
  word_id,
  slug,
  pinyin,
  part_of_speech,
  meaning_vi,
  meaning_en,
  source_confidence,
  review_status,
  content_hash,
  is_published,
  sense_order,
  is_primary,
  created_at,
  updated_at
)
select
  w.id,
  w.slug,
  w.pinyin,
  w.part_of_speech,
  w.vietnamese_meaning,
  w.english_meaning,
  w.source_confidence,
  w.review_status,
  w.content_hash,
  w.is_published,
  1,
  true,
  w.created_at,
  w.updated_at
from public.words w;

update public.word_examples we
set sense_id = ws.id
from public.word_senses ws
where ws.word_id = we.word_id
  and ws.is_primary = true
  and we.sense_id is null;

create trigger word_senses_set_updated_at
before update on public.word_senses
for each row execute function public.set_updated_at();

alter table public.word_senses enable row level security;

create policy "word_senses_read"
on public.word_senses
for select
to public
using (
  is_published
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

create policy "word_senses_admin"
on public.word_senses
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy "word_examples_read" on public.word_examples;

create policy "word_examples_read"
on public.word_examples
for select
to public
using (
  exists (
    select 1
    from public.words w
    where w.id = word_examples.word_id
      and (
        w.is_published
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      )
  )
  and (
    word_examples.sense_id is null
    or exists (
      select 1
      from public.word_senses ws
      where ws.id = word_examples.sense_id
        and (
          ws.is_published
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role = 'admin'
          )
        )
    )
  )
);
