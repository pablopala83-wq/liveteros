-- LOS TEROS LIVE V3.0 ACCESS MODEL
-- Reference patch. Already applied to the current Los Teros Live Supabase project.

alter table public.matches
  add column if not exists assigned_tagger uuid,
  add column if not exists viewer_token_hash text,
  add column if not exists viewer_token_created_at timestamptz;

create index if not exists matches_assigned_tagger_idx on public.matches(assigned_tagger);
create unique index if not exists matches_viewer_token_hash_uidx on public.matches(viewer_token_hash) where viewer_token_hash is not null;

-- Exact production functions/policies are managed in Supabase.
-- This file is intentionally non-executable as a duplicate patch to avoid reapplying security objects blindly.

-- Existing matches were backfilled in production so the creator remains the assigned tagger:
-- update public.matches set assigned_tagger = created_by where assigned_tagger is null;
