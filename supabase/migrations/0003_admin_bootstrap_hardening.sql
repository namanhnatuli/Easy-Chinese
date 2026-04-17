create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    avatar_url,
    role
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'avatar_url',
    'user'::public.app_role
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  return new;
end;
$$;

create or replace function public.prevent_profile_role_self_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if auth.role() <> 'service_role' and new.role <> 'user'::public.app_role then
      raise exception 'role changes are server-managed only';
    end if;
    return new;
  end if;

  if auth.role() <> 'service_role' and new.role is distinct from old.role then
    raise exception 'role changes are server-managed only';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_self_change on public.profiles;
create trigger profiles_prevent_role_self_change
before insert or update on public.profiles
for each row
execute function public.prevent_profile_role_self_change();

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id and role = 'user'::public.app_role);
