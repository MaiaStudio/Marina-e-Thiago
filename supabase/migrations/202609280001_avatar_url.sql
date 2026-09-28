-- Incremental migration: add avatar_url to guestbook_messages and update submit_guestbook_message RPC
-- Safe and non-destructive: uses ADD COLUMN IF NOT EXISTS.

-- 1. Add avatar_url column to guestbook_messages
alter table if exists public.guestbook_messages
  add column if not exists avatar_url text;

-- 2. Update submit_guestbook_message to accept and persist p_avatar_url
create or replace function public.submit_guestbook_message(
  p_wedding_id uuid,
  p_guest_name text,
  p_relationship text,
  p_message text,
  p_ip_hash text,
  p_avatar_url text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_auto boolean;
  v_count integer;
  v_result public.guestbook_messages;
begin
  if p_ip_hash is null or length(p_ip_hash) <> 64 then
    raise exception 'INVALID_RATE_KEY';
  end if;

  select auto_approve into v_auto from public.weddings where id = p_wedding_id;
  if not found then
    raise exception 'WEDDING_NOT_FOUND';
  end if;

  insert into public.guestbook_rate_limits(wedding_id, ip_hash, window_start, attempts)
  values(p_wedding_id, p_ip_hash, now(), 1)
  on conflict(wedding_id, ip_hash) do update set
    attempts = case
      when public.guestbook_rate_limits.window_start < now() - interval '15 minutes' then 1
      else public.guestbook_rate_limits.attempts + 1
    end,
    window_start = case
      when public.guestbook_rate_limits.window_start < now() - interval '15 minutes' then now()
      else public.guestbook_rate_limits.window_start
    end
  returning attempts into v_count;

  if v_count > 3 then
    raise exception 'RATE_LIMITED';
  end if;

  insert into public.guestbook_messages(wedding_id, guest_name, relationship, message, avatar_url, status)
  values(
    p_wedding_id,
    trim(p_guest_name),
    trim(coalesce(p_relationship, '')),
    trim(p_message),
    p_avatar_url,
    case when v_auto then 'approved' else 'pending' end
  )
  returning * into v_result;

  return to_jsonb(v_result);
end; $$;

revoke all on function public.submit_guestbook_message(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_guestbook_message(uuid, text, text, text, text, text) to service_role;

-- 3. Ensure photographer and wedding exist without duplicates
insert into public.photographers(id, name)
values('318a19f8-6f3d-48ad-b0b2-2c6d44f1b030', 'Acervo Marina & Thiago')
on conflict do nothing;

insert into public.weddings(id, photographer_id, slug, names, wedding_date)
values(
  'd92db886-8fab-4561-90f3-d7e448cc0425',
  '318a19f8-6f3d-48ad-b0b2-2c6d44f1b030',
  'marina-thiago-040425',
  'Marina & Thiago',
  '2025-04-04'
)
on conflict do nothing;
