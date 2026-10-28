create or replace function public.update_match_details(
  p_match_id uuid,
  p_opponent_name text,
  p_opponent_color text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_opponent_name,''));
  v_color text := upper(trim(coalesce(p_opponent_color,'')));
  v_now timestamptz := clock_timestamp();
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.match_users mu
    where mu.match_id = p_match_id
      and mu.user_id = auth.uid()
      and mu.role = 'admin'
  ) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if length(v_name) < 1 or length(v_name) > 24 then
    raise exception 'INVALID_OPPONENT_NAME';
  end if;

  if v_color !~ '^#[0-9A-F]{6}$' then
    raise exception 'INVALID_OPPONENT_COLOR';
  end if;

  update public.matches m
  set opponent_name = v_name,
      opponent_color = v_color,
      updated_at = v_now
  where m.id = p_match_id;

  if not found then
    raise exception 'MATCH_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'id', p_match_id,
    'opponent_name', v_name,
    'opponent_color', v_color,
    'updated_at', v_now
  );
end;
$$;

revoke all on function public.update_match_details(uuid,text,text) from public, anon;
grant execute on function public.update_match_details(uuid,text,text) to authenticated;
