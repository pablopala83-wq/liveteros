-- LOS TEROS LIVE V23 - Delete match RPC
-- Run once in Supabase SQL Editor.

create or replace function public.delete_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_match_role(p_match_id, array['admin']) then
    raise exception 'Only match admins can delete matches';
  end if;

  delete from public.match_users where match_id = p_match_id;
  delete from public.matches where id = p_match_id;
end;
$$;

grant execute on function public.delete_match(uuid) to authenticated;
