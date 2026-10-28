-- =============================================================================
-- Calabar Tastee — team lookup, holidays, no shifts for Database Administrators
-- Paste this whole file into Supabase → SQL Editor → Run.  Safe to run twice.
-- =============================================================================

-- 1. Team lookup: add phone number to the directory (team members only)
drop function if exists public.team_directory();
create function public.team_directory()
returns table (id uuid, full_name text, job_title text, role public.app_role, phone text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name, p.job_title, ur.role, p.phone
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id
  where p.is_active
    and public.is_team_member()
  order by p.full_name
$$;
revoke execute on function public.team_directory() from public, anon;
grant execute on function public.team_directory() to authenticated;

-- 2. Holidays / time off (staff_id null = whole team, e.g. a bank holiday)
create table if not exists public.time_off (
  id          bigint generated always as identity primary key,
  staff_id    uuid references auth.users (id) on delete cascade,
  start_date  date not null,
  end_date    date not null,
  reason      text not null default 'Holiday' check (char_length(reason) <= 100),
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  constraint time_off_order check (end_date >= start_date)
);
create index if not exists time_off_dates_idx on public.time_off (start_date, end_date);

alter table public.time_off enable row level security;
revoke all on public.time_off from anon, authenticated;
grant select, insert, update, delete on public.time_off to authenticated;

drop policy if exists "time_off: team reads" on public.time_off;
create policy "time_off: team reads" on public.time_off
  for select to authenticated using ((select public.is_team_member()));
drop policy if exists "time_off: managers insert" on public.time_off;
create policy "time_off: managers insert" on public.time_off
  for insert to authenticated with check ((select public.is_manager()));
drop policy if exists "time_off: managers update" on public.time_off;
create policy "time_off: managers update" on public.time_off
  for update to authenticated using ((select public.is_manager())) with check ((select public.is_manager()));
drop policy if exists "time_off: managers delete" on public.time_off;
create policy "time_off: managers delete" on public.time_off
  for delete to authenticated using ((select public.is_manager()));

-- 3. Database Administrators cannot be given shifts
create or replace function public.shifts_no_dba()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.role_of(new.staff_id) = 'dba' then
    raise exception 'Shifts cannot be assigned to this account.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.shifts_no_dba() from public, anon, authenticated;

drop trigger if exists shifts_no_dba on public.shifts;
create trigger shifts_no_dba
  before insert or update on public.shifts
  for each row execute function public.shifts_no_dba();

-- remove any shifts already given to a Database Administrator
delete from public.shifts s
using public.user_roles ur
where ur.user_id = s.staff_id and ur.role = 'dba';
