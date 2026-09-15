-- LOS TEROS LIVE - V4 ONLINE PATCH
-- Run once in Supabase SQL Editor after the initial schema.

alter table public.matches
  add column if not exists live_state jsonb not null default '{}'::jsonb;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
on public.profiles for select to authenticated
using (id = auth.uid());

grant select on public.profiles to authenticated;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email,''), '@', 1))
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_teros_profile on auth.users;
create trigger on_auth_user_created_teros_profile
after insert or update of email on auth.users
for each row execute function public.handle_new_user_profile();

-- Backfill profiles for users that already exist.
insert into public.profiles (id, email, display_name)
select id, email, split_part(coalesce(email,''), '@', 1)
from auth.users
on conflict (id) do update set email = excluded.email, updated_at = now();

create or replace function public.share_match_by_email(
  p_match_id uuid,
  p_email text,
  p_role text default 'viewer'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_email text;
begin
  if not public.has_match_role(p_match_id, array['admin']) then
    raise exception 'Only match admins can share access';
  end if;

  if p_role not in ('admin','editor','viewer') then
    raise exception 'Invalid role';
  end if;

  select id, email into v_user_id, v_email
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    raise exception 'USER_NOT_FOUND';
  end if;

  insert into public.match_users(match_id,user_id,role)
  values (p_match_id,v_user_id,p_role)
  on conflict (match_id,user_id)
  do update set role = excluded.role;

  return jsonb_build_object('user_id',v_user_id,'email',v_email,'role',p_role);
end;
$$;

grant execute on function public.share_match_by_email(uuid,text,text) to authenticated;

create or replace function public.get_match_members(p_match_id uuid)
returns table(user_id uuid, email text, display_name text, role text)
language sql
stable
security definer
set search_path = public, auth
as $$
  select mu.user_id, u.email, coalesce(p.display_name, split_part(coalesce(u.email,''),'@',1)), mu.role
  from public.match_users mu
  join auth.users u on u.id = mu.user_id
  left join public.profiles p on p.id = mu.user_id
  where mu.match_id = p_match_id
    and public.is_match_member(p_match_id)
  order by case mu.role when 'admin' then 1 when 'editor' then 2 else 3 end, u.email;
$$;

grant execute on function public.get_match_members(uuid) to authenticated;

create or replace function public.remove_match_member(p_match_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_match_role(p_match_id, array['admin']) then
    raise exception 'Only match admins can remove access';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot remove yourself from this match';
  end if;
  delete from public.match_users where match_id=p_match_id and user_id=p_user_id;
end;
$$;

grant execute on function public.remove_match_member(uuid,uuid) to authenticated;

-- live_state is already covered by the existing matches UPDATE policy.
-- matches is already in supabase_realtime from the initial script.
