-- Apply in the Supabase SQL editor or with `supabase db push`.
-- Public clients never receive the service-role key and cannot insert directly.
create extension if not exists pgcrypto;
create table if not exists public.photographers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id),
  name text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.weddings (
  id uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references public.photographers(id),
  slug text not null unique,
  names text not null,
  wedding_date date not null,
  auto_approve boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.guestbook_messages (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  guest_name text not null check (char_length(guest_name) between 2 and 80),
  relationship text not null default '' check (char_length(relationship) <= 80),
  message text not null check (char_length(message) between 5 and 1200),
  status text not null default 'approved' check (status in ('approved','pending','rejected')),
  created_at timestamptz not null default now()
);
create index if not exists guestbook_wedding_status_created on public.guestbook_messages(wedding_id,status,created_at desc);
create table if not exists public.guestbook_rate_limits (
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  ip_hash text not null,
  window_start timestamptz not null,
  attempts integer not null,
  primary key (wedding_id, ip_hash)
);
alter table public.photographers enable row level security;
alter table public.weddings enable row level security;
alter table public.guestbook_messages enable row level security;
alter table public.guestbook_rate_limits enable row level security;
revoke all on public.photographers, public.weddings, public.guestbook_messages, public.guestbook_rate_limits from anon, authenticated;
grant select on public.photographers, public.weddings, public.guestbook_messages to authenticated;
grant update(status) on public.guestbook_messages to authenticated;
create policy photographers_owner_select on public.photographers for select to authenticated using (owner_id = auth.uid());
create policy weddings_owner_select on public.weddings for select to authenticated using (
  exists(select 1 from public.photographers p where p.id = photographer_id and p.owner_id = auth.uid())
);
create policy guestbook_owner_select on public.guestbook_messages for select to authenticated using (
  exists(select 1 from public.weddings w join public.photographers p on p.id = w.photographer_id where w.id = wedding_id and p.owner_id = auth.uid())
);
create policy guestbook_owner_moderate on public.guestbook_messages for update to authenticated using (
  exists(select 1 from public.weddings w join public.photographers p on p.id = w.photographer_id where w.id = wedding_id and p.owner_id = auth.uid())
) with check (
  exists(select 1 from public.weddings w join public.photographers p on p.id = w.photographer_id where w.id = wedding_id and p.owner_id = auth.uid())
);
create or replace function public.submit_guestbook_message(p_wedding_id uuid, p_guest_name text, p_relationship text, p_message text, p_ip_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_auto boolean; v_count integer; v_result public.guestbook_messages;
begin
  if p_ip_hash is null or length(p_ip_hash) <> 64 then raise exception 'INVALID_RATE_KEY'; end if;
  select auto_approve into v_auto from public.weddings where id = p_wedding_id;
  if not found then raise exception 'WEDDING_NOT_FOUND'; end if;
  insert into public.guestbook_rate_limits(wedding_id,ip_hash,window_start,attempts)
  values(p_wedding_id,p_ip_hash,now(),1)
  on conflict(wedding_id,ip_hash) do update set
    attempts = case when public.guestbook_rate_limits.window_start < now() - interval '15 minutes' then 1 else public.guestbook_rate_limits.attempts + 1 end,
    window_start = case when public.guestbook_rate_limits.window_start < now() - interval '15 minutes' then now() else public.guestbook_rate_limits.window_start end
  returning attempts into v_count;
  if v_count > 3 then raise exception 'RATE_LIMITED'; end if;
  insert into public.guestbook_messages(wedding_id,guest_name,relationship,message,status)
  values(p_wedding_id,trim(p_guest_name),trim(coalesce(p_relationship,'')),trim(p_message),case when v_auto then 'approved' else 'pending' end)
  returning * into v_result;
  return to_jsonb(v_result);
end; $$;
revoke all on function public.submit_guestbook_message(uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_guestbook_message(uuid,text,text,text,text) to service_role;
-- Assign owner_id to the photographer's auth user when enabling a moderation dashboard.
insert into public.photographers(id,name) values('318a19f8-6f3d-48ad-b0b2-2c6d44f1b030','Acervo Marina & Thiago') on conflict do nothing;
insert into public.weddings(id,photographer_id,slug,names,wedding_date)
values('d92db886-8fab-4561-90f3-d7e448cc0425','318a19f8-6f3d-48ad-b0b2-2c6d44f1b030','marina-thiago-040425','Marina & Thiago','2025-04-04') on conflict do nothing;
