-- 07: Staff availability.
-- Each person marks which days of the week they can work (weekday rows) and can add
-- one-off exceptions for specific dates (on_date rows). A date exception beats the weekly
-- pattern. Staff manage their own; admins / DBAs can see and edit everyone's.

create table if not exists public.availability (
  id          bigint generated always as identity primary key,
  staff_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  weekday     smallint check (weekday between 0 and 6),   -- 0 = Monday … 6 = Sunday
  on_date     date,
  available   boolean not null,
  note        text check (note is null or char_length(note) <= 100),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint availability_one_kind check ((weekday is null) <> (on_date is null)),
  constraint availability_weekday_unique unique (staff_id, weekday),
  constraint availability_date_unique unique (staff_id, on_date)
);
create index if not exists availability_date_idx on public.availability (on_date);

alter table public.availability enable row level security;
revoke all on public.availability from anon, authenticated;
grant select, insert, update, delete on public.availability to authenticated;

drop policy if exists "availability: own or manager reads" on public.availability;
create policy "availability: own or manager reads" on public.availability
  for select to authenticated
  using (public.is_team_member() and (staff_id = auth.uid() or public.is_manager()));

drop policy if exists "availability: own or manager inserts" on public.availability;
create policy "availability: own or manager inserts" on public.availability
  for insert to authenticated
  with check (public.is_team_member() and (staff_id = auth.uid() or public.is_manager()));

drop policy if exists "availability: own or manager updates" on public.availability;
create policy "availability: own or manager updates" on public.availability
  for update to authenticated
  using (public.is_team_member() and (staff_id = auth.uid() or public.is_manager()))
  with check (public.is_team_member() and (staff_id = auth.uid() or public.is_manager()));

drop policy if exists "availability: own or manager deletes" on public.availability;
create policy "availability: own or manager deletes" on public.availability
  for delete to authenticated
  using (public.is_team_member() and (staff_id = auth.uid() or public.is_manager()));

-- Keep "last changed" current.
drop trigger if exists availability_updated_at on public.availability;
create trigger availability_updated_at before update on public.availability
  for each row execute function public.set_updated_at();

-- Activity log: who changed whose availability, and when (shown on the Activity log page).
create or replace function public.log_availability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor   uuid := public.audit_actor();
  v_email   text;
  v_row     public.availability;
  v_name    text;
  v_day     text;
  v_changes jsonb;
  v_was     boolean;
  v_now     boolean;
begin
  -- Same rule as the rest of the log: Database Administrators' actions are not stored.
  if v_actor is not null and public.role_of(v_actor) = 'dba' then
    return null;
  end if;

  if tg_op = 'UPDATE' then
    if old.available = new.available and old.note is not distinct from new.note then
      return null;  -- nothing meaningful changed
    end if;
  end if;

  if tg_op = 'DELETE' then
    v_row := old;
  else
    v_row := new;
  end if;

  if v_actor is not null then
    select email into v_email from public.profiles where id = v_actor;
  end if;
  select full_name into v_name from public.profiles where id = v_row.staff_id;

  v_day := case
    when v_row.weekday is not null
      then (array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'])[v_row.weekday + 1] || 's'
    else to_char(v_row.on_date, 'Dy DD Mon YYYY')
  end;

  -- was = what it said before (null when newly set), now = what it says now (null when cleared)
  if tg_op = 'INSERT' then
    v_was := null;
    v_now := new.available;
  elsif tg_op = 'DELETE' then
    v_was := old.available;
    v_now := null;
  else
    v_was := old.available;
    v_now := new.available;
  end if;

  v_changes := jsonb_build_object(
    'day', v_day,
    'was', v_was,
    'now', v_now,
    'note', v_row.note,
    'repeats', v_row.weekday is not null
  );

  insert into public.activity_logs (actor_id, actor_email, action, entity, entity_id, entity_label, changes)
  values (
    v_actor,
    coalesce(v_email, case when v_actor is null then 'system' end),
    lower(tg_op),
    'availability',
    v_row.id::text,
    coalesce(v_name, 'Unknown'),
    v_changes
  );
  return null;
end;
$$;
revoke execute on function public.log_availability() from public, anon, authenticated;

drop trigger if exists audit_availability on public.availability;
create trigger audit_availability after insert or update or delete on public.availability
  for each row execute function public.log_availability();

-- Live updates in open sessions.
do $$
begin
  alter publication supabase_realtime add table public.availability;
exception when duplicate_object then null;
end $$;
