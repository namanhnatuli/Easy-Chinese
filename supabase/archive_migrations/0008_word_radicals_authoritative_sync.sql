create or replace function public.sync_word_main_radical_from_links()
returns trigger
language plpgsql
as $$
declare
  v_word_id uuid;
  v_main_radical_id uuid;
begin
  v_word_id := coalesce(new.word_id, old.word_id);

  select word_radicals.radical_id
  into v_main_radical_id
  from public.word_radicals
  where word_radicals.word_id = v_word_id
    and word_radicals.is_main = true
  order by word_radicals.sort_order
  limit 1;

  if v_main_radical_id is null then
    select word_radicals.radical_id
    into v_main_radical_id
    from public.word_radicals
    where word_radicals.word_id = v_word_id
    order by word_radicals.sort_order
    limit 1;
  end if;

  update public.words
  set radical_id = v_main_radical_id
  where words.id = v_word_id
    and words.radical_id is distinct from v_main_radical_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_word_main_radical_from_links_trigger on public.word_radicals;
create trigger sync_word_main_radical_from_links_trigger
after insert or update or delete on public.word_radicals
for each row
execute function public.sync_word_main_radical_from_links();
