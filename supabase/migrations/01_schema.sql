-- =============================================================================
--  Calabar Tastee — core schema, roles and Row-Level Security
--  File: supabase/migrations/01_schema.sql
--
--  Run on a FRESH Supabase project (SQL Editor → paste → Run, or `supabase db push`).
--  Then run 02_seed.sql.
--
--  Role model (one role per user, stored in public.user_roles):
--    dba   — full control, the only role that can grant/revoke admin or dba
--    admin — manages staff accounts, shifts, hours, feedback, operational data
--    staff — manages menu items/categories, views the published roster
--
--  A user with NO row in user_roles, or whose profile is inactive, has no access
--  to anything beyond the public website — even if they somehow obtain a login.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 0. Enums
-- -----------------------------------------------------------------------------
create type public.app_role        as enum ('dba', 'admin', 'staff');
create type public.shift_status    as enum ('draft', 'published');
create type public.feedback_status as enum ('new', 'read', 'archived');
create type public.order_channel   as enum ('phone', 'whatsapp', 'walk_in', 'delivery_app', 'web');
create type public.order_status    as enum ('enquiry', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled');

-- -----------------------------------------------------------------------------
-- 1. Generic helpers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- The one account that is always promoted to DBA when it signs up / is invited.
create or replace function public.primary_dba_email()
returns text
language sql
immutable
set search_path = ''
as $$ select 'akinboludave@gmail.com'::text $$;

-- -----------------------------------------------------------------------------
-- 2. Profiles & roles
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null default '',
  full_name   text not null default '' check (char_length(full_name) <= 120),
  phone       text check (phone is null or char_length(phone) <= 30),
  job_title   text check (job_title is null or char_length(job_title) <= 60),  -- e.g. Chef, Front of house
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'One row per auth user. Created automatically by trigger.';

create table public.user_roles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  role        public.app_role not null,
  granted_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.user_roles is 'Authoritative role per user. Never derived from user metadata (which users can edit).';
create index user_roles_role_idx on public.user_roles (role);

-- Role lookups. SECURITY DEFINER so RLS policies can call them without recursion.
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select ur.role
  from public.user_roles ur
  join public.profiles p on p.id = ur.user_id
  where ur.user_id = (select auth.uid())
    and p.is_active
$$;

create or replace function public.role_of(target uuid)
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$ select role from public.user_roles where user_id = target $$;

create or replace function public.is_dba()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_app_role() = 'dba', false) $$;

create or replace function public.is_manager()          -- dba or admin
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_app_role() in ('dba', 'admin'), false) $$;

create or replace function public.is_team_member()      -- dba, admin or staff
returns boolean language sql stable security definer set search_path = ''
as $$ select public.current_app_role() is not null $$;

-- Names of active colleagues, for the roster view. Exposes no emails/phones.
create or replace function public.team_directory()
returns table (id uuid, full_name text, job_title text, role public.app_role)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name, p.job_title, ur.role
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id
  where p.is_active
    and public.is_team_member()
  order by p.full_name
$$;

-- New auth user → profile row. Role is NOT assigned here (except the primary DBA):
-- roles are granted explicitly by the staff-management API or by a DBA.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, phone, job_title)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(left(new.raw_user_meta_data ->> 'full_name', 120), ''),
    left(new.raw_user_meta_data ->> 'phone', 30),
    left(new.raw_user_meta_data ->> 'job_title', 60)
  )
  on conflict (id) do nothing;

  if lower(coalesce(new.email, '')) = public.primary_dba_email() then
    insert into public.user_roles (user_id, role)
    values (new.id, 'dba')
    on conflict (user_id) do update set role = 'dba';
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email in sync when an auth email changes.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Guard: never remove/demote the last active DBA (prevents lock-out).
create or replace function public.guard_user_roles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  remaining int;
begin
  if (tg_op = 'DELETE' and old.role = 'dba')
     or (tg_op = 'UPDATE' and old.role = 'dba' and new.role <> 'dba') then
    select count(*) into remaining
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.role = 'dba' and p.is_active and ur.user_id <> old.user_id;

    if remaining = 0 then
      raise exception 'Cannot remove or demote the last active DBA.' using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  if new.granted_by is null then
    new.granted_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger user_roles_guard
  before insert or update or delete on public.user_roles
  for each row execute function public.guard_user_roles();

-- Guard: what a signed-in user may change on a profile.
--   * email is managed by auth only
--   * is_active: dba may change anyone but themselves; admin may change staff only
--   * the last active DBA can never be deactivated
-- Calls with no auth.uid() (service-role API, SQL editor) are trusted.
create or replace function public.guard_profiles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller      uuid := auth.uid();
  caller_role public.app_role := public.current_app_role();
  target_role public.app_role := public.role_of(new.id);
  remaining   int;
begin
  new.updated_at := now();

  if new.id <> old.id then
    raise exception 'Profile id cannot change.' using errcode = 'P0001';
  end if;

  if caller is not null then
    new.email := old.email;

    if new.is_active is distinct from old.is_active then
      if caller = new.id then
        raise exception 'You cannot change your own active status.' using errcode = 'P0001';
      elsif caller_role = 'dba' then
        null; -- allowed
      elsif caller_role = 'admin' and coalesce(target_role, 'staff') = 'staff' then
        null; -- allowed
      else
        raise exception 'Not allowed to change this account''s active status.' using errcode = '42501';
      end if;
    end if;
  end if;

  if old.is_active and not new.is_active and target_role = 'dba' then
    select count(*) into remaining
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.role = 'dba' and p.is_active and p.id <> new.id;
    if remaining = 0 then
      raise exception 'Cannot deactivate the last active DBA.' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profiles();

-- -----------------------------------------------------------------------------
-- 3. Menu: categories & items
-- -----------------------------------------------------------------------------
create table public.categories (
  id          bigint generated always as identity primary key,
  name        text not null unique check (char_length(name) between 1 and 80),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text check (description is null or char_length(description) <= 500),
  sort_order  integer not null default 0,
  is_visible  boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.categories_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.name := btrim(new.name);
  if new.slug is null or btrim(new.slug) = '' or (tg_op = 'UPDATE' and new.name <> old.name and new.slug = old.slug) then
    new.slug := btrim(regexp_replace(lower(new.name), '[^a-z0-9]+', '-', 'g'), '-');
  end if;
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger categories_before_write
  before insert or update on public.categories
  for each row execute function public.categories_before_write();

create table public.menu_items (
  id              bigint generated always as identity primary key,
  category_id     bigint not null references public.categories (id) on delete restrict,
  name            text not null check (char_length(name) between 1 and 120),
  description     text not null default '' check (char_length(description) <= 1000),
  price           numeric(8, 2) not null check (price >= 0),        -- GBP
  image_url       text check (image_url is null or char_length(image_url) <= 1000),
  dietary         text check (dietary is null or char_length(dietary) <= 60),
  is_available    boolean not null default true,                    -- false = hidden from public menu
  is_popular      boolean not null default false,
  is_best_seller  boolean not null default false,
  is_spicy        boolean not null default false,
  is_preorder     boolean not null default false,
  sort_order      integer not null default 0,
  created_by      uuid references auth.users (id) on delete set null default auth.uid(),
  updated_by      uuid references auth.users (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index menu_items_category_idx on public.menu_items (category_id, sort_order);

create or replace function public.menu_items_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  new.created_by := old.created_by;
  return new;
end;
$$;

create trigger menu_items_before_update
  before update on public.menu_items
  for each row execute function public.menu_items_before_update();

-- -----------------------------------------------------------------------------
-- 4. Shifts / roster
--    shift_date + start/end are Europe/London wall-clock values, so GMT/BST is
--    handled naturally. Absolute instant if ever needed:
--      (shift_date + start_time) at time zone 'Europe/London'
--    Shifts never cross midnight (enforced by check constraint).
-- -----------------------------------------------------------------------------
create table public.shifts (
  id            bigint generated always as identity primary key,
  staff_id      uuid not null references public.profiles (id) on delete cascade,
  shift_date    date not null,
  start_time    time not null,
  end_time      time not null,
  position      text check (position is null or char_length(position) <= 60),   -- e.g. Kitchen, Front of house
  notes         text check (notes is null or char_length(notes) <= 500),
  status        public.shift_status not null default 'draft',
  published_at  timestamptz,
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint shifts_time_order check (end_time > start_time)
);
create index shifts_date_idx on public.shifts (shift_date);
create index shifts_staff_date_idx on public.shifts (staff_id, shift_date);

create or replace function public.shifts_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Assignee must be an active team member.
  if not exists (
    select 1 from public.profiles p
    join public.user_roles ur on ur.user_id = p.id
    where p.id = new.staff_id and p.is_active
  ) then
    raise exception 'Shifts can only be assigned to active team members.' using errcode = 'P0001';
  end if;

  -- No overlapping shifts for the same person on the same day.
  if exists (
    select 1 from public.shifts s
    where s.staff_id = new.staff_id
      and s.shift_date = new.shift_date
      and s.id <> new.id
      and s.start_time < new.end_time
      and new.start_time < s.end_time
  ) then
    raise exception 'This overlaps another shift for the same staff member.' using errcode = 'P0001';
  end if;

  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.published_at := now();
  elsif new.status = 'draft' then
    new.published_at := null;
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

create trigger shifts_before_write
  before insert or update on public.shifts
  for each row execute function public.shifts_before_write();

-- -----------------------------------------------------------------------------
-- 5. Opening hours & customer feedback (used by the public site)
-- -----------------------------------------------------------------------------
create table public.opening_hours (
  id          smallint primary key check (id between 1 and 7),     -- ISO weekday, 1 = Monday
  day         text not null unique,                                 -- 'monday' …
  day_label   text not null,                                        -- 'Monday' …
  open_time   time,
  close_time  time,
  is_closed   boolean not null default false,
  updated_at  timestamptz not null default now(),
  constraint opening_hours_valid check (
    is_closed or (open_time is not null and close_time is not null and close_time > open_time)
  )
);

create trigger opening_hours_updated_at
  before update on public.opening_hours
  for each row execute function public.set_updated_at();

create table public.feedback (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(btrim(name)) between 1 and 100),
  email       text not null check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone       text check (phone is null or char_length(phone) <= 30),
  comment     text not null check (char_length(btrim(comment)) between 1 and 2000),
  status      public.feedback_status not null default 'new',
  created_at  timestamptz not null default now()
);
create index feedback_status_idx on public.feedback (status, created_at desc);

-- -----------------------------------------------------------------------------
-- 6. Orders (Phase 1: staff record phone/WhatsApp orders; Phase 2: online checkout)
-- -----------------------------------------------------------------------------
create table public.orders (
  id              bigint generated always as identity primary key,
  reference       text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  channel         public.order_channel not null default 'phone',
  status          public.order_status not null default 'enquiry',
  customer_name   text not null check (char_length(customer_name) between 1 and 120),
  customer_phone  text check (customer_phone is null or char_length(customer_phone) <= 30),
  customer_email  text check (customer_email is null or char_length(customer_email) <= 254),
  notes           text check (notes is null or char_length(notes) <= 1000),
  pickup_at       timestamptz,
  total           numeric(10, 2) not null default 0,
  created_by      uuid references auth.users (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index orders_status_idx on public.orders (status, created_at desc);

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id            bigint generated always as identity primary key,
  order_id      bigint not null references public.orders (id) on delete cascade,
  menu_item_id  bigint references public.menu_items (id) on delete set null,
  item_name     text not null,                                   -- snapshot at time of order
  unit_price    numeric(8, 2) not null check (unit_price >= 0),  -- snapshot at time of order
  quantity      integer not null check (quantity between 1 and 100),
  line_total    numeric(10, 2) generated always as (unit_price * quantity) stored
);
create index order_items_order_idx on public.order_items (order_id);

create or replace function public.recalculate_order_total()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target bigint := coalesce(new.order_id, old.order_id);
begin
  update public.orders o
  set total = coalesce((select sum(line_total) from public.order_items where order_id = target), 0)
  where o.id = target;
  return null;
end;
$$;

create trigger order_items_total
  after insert or update or delete on public.order_items
  for each row execute function public.recalculate_order_total();

-- -----------------------------------------------------------------------------
-- 7. Activity log (written ONLY by triggers; read by admin/dba)
-- -----------------------------------------------------------------------------
create table public.activity_logs (
  id           bigint generated always as identity primary key,
  actor_id     uuid references auth.users (id) on delete set null,
  actor_email  text,
  action       text not null check (action in ('insert', 'update', 'delete')),
  entity       text not null,          -- table name
  entity_id    text,
  entity_label text,                   -- e.g. the menu item name at the time
  changes      jsonb not null default '{}'::jsonb,   -- insert: row; update: {field: {old, new}}; delete: row
  created_at   timestamptz not null default now()
);
create index activity_logs_created_idx on public.activity_logs (created_at desc);
create index activity_logs_entity_idx on public.activity_logs (entity, entity_id);

-- Who performed the change. Normally the signed-in user. For requests made by
-- the server-side staff API (service role, no user JWT) the API forwards the
-- caller's id in an `x-actor-id` header; that header is ONLY trusted when the
-- request itself is authenticated as service_role, so browsers can't spoof it.
create or replace function public.audit_actor()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_claims jsonb;
  v_hdr    text;
begin
  if v_uid is not null then
    return v_uid;
  end if;
  v_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  if coalesce(v_claims ->> 'role', '') = 'service_role' then
    v_hdr := nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-actor-id';
    if v_hdr ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      return v_hdr::uuid;
    end if;
  end if;
  return null;
end;
$$;

-- Usage: execute function public.log_activity('<pk column>', '<label column or empty>')
create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor  uuid := public.audit_actor();
  v_email  text;
  v_old    jsonb;
  v_new    jsonb;
  v_row    jsonb;
  v_diff   jsonb := '{}'::jsonb;
  v_key    text;
  v_pk     text := tg_argv[0];
  v_label  text := nullif(tg_argv[1], '');
  v_ignore text[] := array['updated_at', 'updated_by', 'created_at', 'published_at'];
begin
  if v_actor is not null then
    select email into v_email from public.profiles where id = v_actor;
  end if;

  if tg_op = 'INSERT' then
    v_new := to_jsonb(new);  v_row := v_new;  v_diff := v_new;
  elsif tg_op = 'DELETE' then
    v_old := to_jsonb(old);  v_row := v_old;  v_diff := v_old;
  else
    v_old := to_jsonb(old);  v_new := to_jsonb(new);  v_row := v_new;
    for v_key in select jsonb_object_keys(v_new) loop
      if not (v_key = any (v_ignore)) and (v_new -> v_key) is distinct from (v_old -> v_key) then
        v_diff := v_diff || jsonb_build_object(v_key, jsonb_build_object('old', v_old -> v_key, 'new', v_new -> v_key));
      end if;
    end loop;
    if v_diff = '{}'::jsonb then
      return null;  -- nothing meaningful changed
    end if;
  end if;

  insert into public.activity_logs (actor_id, actor_email, action, entity, entity_id, entity_label, changes)
  values (
    v_actor,
    coalesce(v_email, case when v_actor is null then 'system' end),
    lower(tg_op),
    tg_table_name,
    v_row ->> v_pk,
    case when v_label is not null then v_row ->> v_label end,
    v_diff
  );
  return null;
end;
$$;

create trigger audit_menu_items    after insert or update or delete on public.menu_items    for each row execute function public.log_activity('id', 'name');
create trigger audit_categories    after insert or update or delete on public.categories    for each row execute function public.log_activity('id', 'name');
create trigger audit_shifts        after insert or update or delete on public.shifts        for each row execute function public.log_activity('id', '');
create trigger audit_user_roles    after insert or update or delete on public.user_roles    for each row execute function public.log_activity('user_id', 'role');
create trigger audit_profiles      after update                     on public.profiles      for each row execute function public.log_activity('id', 'full_name');
create trigger audit_opening_hours after update                     on public.opening_hours for each row execute function public.log_activity('id', 'day_label');

-- -----------------------------------------------------------------------------
-- 8. Privileges — start from nothing for anon, then grant only what's needed.
--    RLS (below) is what actually decides which rows each role can touch.
-- -----------------------------------------------------------------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon;

grant usage on schema public to anon, authenticated;

-- Public website
grant select on public.categories, public.menu_items, public.opening_hours to anon;
grant insert (name, email, phone, comment) on public.feedback to anon;

-- Signed-in users (RLS narrows this down per role)
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke insert, update, delete on public.activity_logs from authenticated;   -- triggers only

grant execute on function
  public.current_app_role(), public.is_dba(), public.is_manager(), public.is_team_member(),
  public.role_of(uuid), public.team_directory()
to authenticated;

-- -----------------------------------------------------------------------------
-- 9. Row-Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.user_roles     enable row level security;
alter table public.categories     enable row level security;
alter table public.menu_items     enable row level security;
alter table public.shifts         enable row level security;
alter table public.opening_hours  enable row level security;
alter table public.feedback       enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.activity_logs  enable row level security;

-- profiles ---------------------------------------------------------------
create policy "profiles: read own or as manager"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_manager()));

create policy "profiles: update own, dba any, admin staff"
  on public.profiles for update to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_dba())
    or ((select public.is_manager()) and coalesce(public.role_of(id), 'staff') = 'staff')
  )
  with check (
    id = (select auth.uid())
    or (select public.is_dba())
    or ((select public.is_manager()) and coalesce(public.role_of(id), 'staff') = 'staff')
  );
-- No insert/delete policies: rows are created by trigger and removed with the auth user.

-- user_roles -------------------------------------------------------------
create policy "user_roles: read own or as manager"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_manager()));

create policy "user_roles: dba inserts"
  on public.user_roles for insert to authenticated
  with check ((select public.is_dba()));

create policy "user_roles: dba updates"
  on public.user_roles for update to authenticated
  using ((select public.is_dba()) and user_id <> (select auth.uid()))
  with check ((select public.is_dba()));

create policy "user_roles: dba deletes"
  on public.user_roles for delete to authenticated
  using ((select public.is_dba()) and user_id <> (select auth.uid()));
-- Admins create staff through the server-side staff API (service key), which
-- applies the same rules: admins may only create/manage role = 'staff'.

-- categories -------------------------------------------------------------
create policy "categories: public reads visible"
  on public.categories for select to anon
  using (is_visible);

create policy "categories: team reads all"
  on public.categories for select to authenticated
  using (is_visible or (select public.is_team_member()));

create policy "categories: team inserts"
  on public.categories for insert to authenticated
  with check ((select public.is_team_member()));

create policy "categories: team updates"
  on public.categories for update to authenticated
  using ((select public.is_team_member()))
  with check ((select public.is_team_member()));

create policy "categories: team deletes"
  on public.categories for delete to authenticated
  using ((select public.is_team_member()));

-- menu_items -------------------------------------------------------------
create policy "menu_items: public reads available"
  on public.menu_items for select to anon
  using (
    is_available
    and exists (select 1 from public.categories c where c.id = category_id and c.is_visible)
  );

create policy "menu_items: team reads all"
  on public.menu_items for select to authenticated
  using (
    (select public.is_team_member())
    or (is_available and exists (select 1 from public.categories c where c.id = category_id and c.is_visible))
  );

create policy "menu_items: team inserts"
  on public.menu_items for insert to authenticated
  with check ((select public.is_team_member()));

create policy "menu_items: team updates"
  on public.menu_items for update to authenticated
  using ((select public.is_team_member()))
  with check ((select public.is_team_member()));

create policy "menu_items: team deletes"
  on public.menu_items for delete to authenticated
  using ((select public.is_team_member()));

-- shifts -----------------------------------------------------------------
create policy "shifts: managers read all, team reads published"
  on public.shifts for select to authenticated
  using (
    (select public.is_manager())
    or (status = 'published' and (select public.is_team_member()))
  );

create policy "shifts: managers insert"
  on public.shifts for insert to authenticated
  with check ((select public.is_manager()));

create policy "shifts: managers update"
  on public.shifts for update to authenticated
  using ((select public.is_manager()))
  with check ((select public.is_manager()));

create policy "shifts: managers delete"
  on public.shifts for delete to authenticated
  using ((select public.is_manager()));

-- opening_hours ----------------------------------------------------------
create policy "opening_hours: everyone reads"
  on public.opening_hours for select to anon, authenticated
  using (true);

create policy "opening_hours: managers update"
  on public.opening_hours for update to authenticated
  using ((select public.is_manager()))
  with check ((select public.is_manager()));

-- feedback ---------------------------------------------------------------
create policy "feedback: anyone submits"
  on public.feedback for insert to anon, authenticated
  with check (status = 'new');

create policy "feedback: managers read"
  on public.feedback for select to authenticated
  using ((select public.is_manager()));

create policy "feedback: managers update"
  on public.feedback for update to authenticated
  using ((select public.is_manager()))
  with check ((select public.is_manager()));

create policy "feedback: managers delete"
  on public.feedback for delete to authenticated
  using ((select public.is_manager()));

-- orders & order_items (staff can log phone/WhatsApp orders) -------------
create policy "orders: team reads"   on public.orders for select to authenticated using ((select public.is_team_member()));
create policy "orders: team inserts" on public.orders for insert to authenticated with check ((select public.is_team_member()));
create policy "orders: team updates" on public.orders for update to authenticated using ((select public.is_team_member())) with check ((select public.is_team_member()));
create policy "orders: managers delete" on public.orders for delete to authenticated using ((select public.is_manager()));

create policy "order_items: team reads"   on public.order_items for select to authenticated using ((select public.is_team_member()));
create policy "order_items: team inserts" on public.order_items for insert to authenticated with check ((select public.is_team_member()));
create policy "order_items: team updates" on public.order_items for update to authenticated using ((select public.is_team_member())) with check ((select public.is_team_member()));
create policy "order_items: team deletes" on public.order_items for delete to authenticated using ((select public.is_team_member()));

-- activity_logs ----------------------------------------------------------
create policy "activity_logs: managers read"
  on public.activity_logs for select to authenticated
  using ((select public.is_manager()));

-- -----------------------------------------------------------------------------
-- 10. Storage: public bucket for menu photos; only team members can write.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy "menu-images: team uploads"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'menu-images' and (select public.is_team_member()));

create policy "menu-images: team updates"
  on storage.objects for update to authenticated
  using (bucket_id = 'menu-images' and (select public.is_team_member()))
  with check (bucket_id = 'menu-images' and (select public.is_team_member()));

create policy "menu-images: team deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'menu-images' and (select public.is_team_member()));

create policy "menu-images: team lists"
  on storage.objects for select to authenticated
  using (bucket_id = 'menu-images' and (select public.is_team_member()));
-- Public visitors load images through the bucket's public URL (no policy needed).

commit;
