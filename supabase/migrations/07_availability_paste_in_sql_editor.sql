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

-- Live updates in open sessions.
do $$
begin
  alter publication supabase_realtime add table public.availability;
exception when duplicate_object then null;
end $$;
