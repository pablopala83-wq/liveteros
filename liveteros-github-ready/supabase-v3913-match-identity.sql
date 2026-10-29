-- Already applied to Supabase project lrkywcgsxcbvzusgmlrh.
-- Keeps edited opponent identity consistent for legacy readers.
update public.matches
set live_state = jsonb_set(
  jsonb_set(coalesce(live_state,'{}'::jsonb), '{opponent}', to_jsonb(opponent_name), true),
  '{opponentColor}', to_jsonb(opponent_color), true
)
where coalesce(live_state->>'opponent','') is distinct from opponent_name
   or coalesce(live_state->>'opponentColor','') is distinct from opponent_color;
