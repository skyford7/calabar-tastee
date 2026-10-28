-- =============================================================================
-- 04 — Username sign-in, lockout, Center Net, DBA activity not recorded
-- =============================================================================
begin;

-- -----------------------------------------------------------------------------
-- 1. Username + password/access-code sign-in
--    Auth still runs on Supabase Auth underneath (email kept for contact), but
--    staff sign in with a username. The server API (/api/auth/login) looks the
--    username up, enforces lockout, and derives the real auth secret with a
--    server-only pepper, so the 5-attempt rule can't be bypassed.
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists username               text,
  add column if not exists login_method           text not null default 'password',
  add column if not exists code_length            smallint,
  add column if not exists must_change_credentials boolean not null default false,
  add column if not exists failed_attempts        integer not null default 0,
  add column if not exists locked_at              timestamptz,   -- auto-suspended after 5 failed attempts
  add column if not exists locked_until           timestamptz,   -- temporary lock (DBA accounts only)
  add column if not exists credentials_migrated   boolean not null default false;

alter table public.profiles drop constraint if exists profiles_login_method_check;
alter table public.profiles add constraint profiles_login_method_check
  check (login_method in ('password', 'code'));
alter table public.profiles drop constraint if exists profiles_code_length_check;
alter table public.profiles add constraint profiles_code_length_check
  check (code_length is null or code_length in (4, 6, 8));
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9][a-z0-9._-]{2,29}$');

create unique index if not exists profiles_username_key on public.profiles (username);

-- Give existing accounts a username from their email (e.g. "akinboludave").
do $$
declare
  r record;
  base text;
  candidate text;
  n int;
begin
  for r in select id, email from public.profiles where username is null order by created_at loop
    base := lower(regexp_replace(split_part(coalesce(r.email, ''), '@', 1), '[^a-zA-Z0-9._-]', '', 'g'));
    base := regexp_replace(base, '^[._-]+', '');
    if char_length(base) < 3 then base := 'user' || base; end if;
    base := left(base, 26);
    candidate := base;
    n := 1;
    while exists (select 1 from public.profiles where username = candidate) loop
      n := n + 1;
      candidate := base || n::text;
    end loop;
    update public.profiles set username = candidate where id = r.id;
  end loop;
end $$;

-- Signed-in users can't change their own sign-in/lockout fields directly;
-- only the server APIs (service role, no auth.uid()) can.
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
    new.email                   := old.email;
    new.username                := old.username;
    new.login_method            := old.login_method;
    new.code_length             := old.code_length;
    new.must_change_credentials := old.must_change_credentials;
    new.failed_attempts         := old.failed_attempts;
    new.locked_at               := old.locked_at;
    new.locked_until            := old.locked_until;
    new.credentials_migrated    := old.credentials_migrated;

    if new.is_active is distinct from old.is_active then
      if caller = new.id then
        raise exception 'You cannot change your own active status.' using errcode = 'P0001';
      elsif caller_role = 'dba' then
        null;
      elsif caller_role = 'admin' and coalesce(target_role, 'staff') = 'staff' then
        null;
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

-- -----------------------------------------------------------------------------
-- 2. Activity log: never record anything done by a Database Administrator,
--    and ignore sign-in bookkeeping columns.
-- -----------------------------------------------------------------------------
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
  v_ignore text[] := array['updated_at', 'updated_by', 'created_at', 'published_at',
                           'failed_attempts', 'credentials_migrated', 'locked_until'];
begin
  -- Database Administrators' actions are not stored.
  if v_actor is not null and public.role_of(v_actor) = 'dba' then
    return null;
  end if;

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
      return null;
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
revoke execute on function public.log_activity() from public, anon, authenticated;

-- Remove anything already recorded for Database Administrators.
delete from public.activity_logs
where actor_id is not null and public.role_of(actor_id) = 'dba';

-- -----------------------------------------------------------------------------
-- 3. Center Net — team announcements with comments
-- -----------------------------------------------------------------------------
create table if not exists public.announcements (
  id          bigint generated always as identity primary key,
  author_id   uuid references auth.users (id) on delete set null,
  author_name text not null default '',
  title       text not null check (char_length(title) between 1 and 150),
  body        text not null check (char_length(body) between 1 and 5000),
  is_pinned   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists announcements_created_idx on public.announcements (is_pinned desc, created_at desc);

create table if not exists public.announcement_comments (
  id              bigint generated always as identity primary key,
  announcement_id bigint not null references public.announcements (id) on delete cascade,
  author_id       uuid references auth.users (id) on delete set null,
  author_name     text not null default '',
  body            text not null check (char_length(body) between 1 and 2000),
  created_at      timestamptz not null default now()
);
create index if not exists announcement_comments_post_idx on public.announcement_comments (announcement_id, created_at);

-- Author is always the signed-in user; only managers may pin.
create or replace function public.announcements_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.author_id := auth.uid();
    new.author_name := coalesce((select full_name from public.profiles where id = auth.uid()), '');
    new.created_at := now();
    if not public.is_manager() then new.is_pinned := false; end if;
  else
    new.author_id := old.author_id;
    new.author_name := old.author_name;
    new.created_at := old.created_at;
    if not public.is_manager() then new.is_pinned := old.is_pinned; end if;
    -- Managers can pin anyone's post but only authors edit the wording.
    if old.author_id is distinct from auth.uid() then
      new.title := old.title;
      new.body := old.body;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists announcements_before_write on public.announcements;
create trigger announcements_before_write
  before insert or update on public.announcements
  for each row execute function public.announcements_before_write();

create or replace function public.announcement_comments_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.author_id := auth.uid();
    new.author_name := coalesce((select full_name from public.profiles where id = auth.uid()), '');
    new.created_at := now();
  else
    new.author_id := old.author_id;
    new.author_name := old.author_name;
    new.created_at := old.created_at;
    new.announcement_id := old.announcement_id;
  end if;
  return new;
end;
$$;

drop trigger if exists announcement_comments_before_write on public.announcement_comments;
create trigger announcement_comments_before_write
  before insert or update on public.announcement_comments
  for each row execute function public.announcement_comments_before_write();

revoke execute on function public.announcements_before_write() from public, anon, authenticated;
revoke execute on function public.announcement_comments_before_write() from public, anon, authenticated;

alter table public.announcements enable row level security;
alter table public.announcement_comments enable row level security;

grant select, insert, update, delete on public.announcements, public.announcement_comments to authenticated;
revoke all on public.announcements, public.announcement_comments from anon;

drop policy if exists "announcements: team reads" on public.announcements;
create policy "announcements: team reads"
  on public.announcements for select to authenticated
  using ((select public.is_team_member()));

drop policy if exists "announcements: team posts" on public.announcements;
create policy "announcements: team posts"
  on public.announcements for insert to authenticated
  with check ((select public.is_team_member()));

drop policy if exists "announcements: author or manager edits" on public.announcements;
create policy "announcements: author or manager edits"
  on public.announcements for update to authenticated
  using ((select public.is_team_member()) and (author_id = (select auth.uid()) or (select public.is_manager())))
  with check ((select public.is_team_member()));

drop policy if exists "announcements: author or manager deletes" on public.announcements;
create policy "announcements: author or manager deletes"
  on public.announcements for delete to authenticated
  using ((select public.is_team_member()) and (author_id = (select auth.uid()) or (select public.is_manager())));

drop policy if exists "comments: team reads" on public.announcement_comments;
create policy "comments: team reads"
  on public.announcement_comments for select to authenticated
  using ((select public.is_team_member()));

drop policy if exists "comments: team posts" on public.announcement_comments;
create policy "comments: team posts"
  on public.announcement_comments for insert to authenticated
  with check ((select public.is_team_member()));

drop policy if exists "comments: author edits" on public.announcement_comments;
create policy "comments: author edits"
  on public.announcement_comments for update to authenticated
  using ((select public.is_team_member()) and author_id = (select auth.uid()))
  with check ((select public.is_team_member()));

drop policy if exists "comments: author or manager deletes" on public.announcement_comments;
create policy "comments: author or manager deletes"
  on public.announcement_comments for delete to authenticated
  using ((select public.is_team_member()) and (author_id = (select auth.uid()) or (select public.is_manager())));

drop trigger if exists audit_announcements on public.announcements;
create trigger audit_announcements after insert or update or delete on public.announcements
  for each row execute function public.log_activity('id', 'title');

-- -----------------------------------------------------------------------------
-- 4. Feedback categories (the public form must be allowed to send them)
-- -----------------------------------------------------------------------------
alter table public.feedback add column if not exists category text not null default 'Feedback';
alter table public.feedback drop constraint if exists feedback_category_check;
alter table public.feedback add constraint feedback_category_check
  check (category in ('Feedback', 'Complaint', 'Menu Suggestion'));
grant insert (category) on public.feedback to anon;

-- -----------------------------------------------------------------------------
-- 5. Menu category order to match calabartastee.com
-- -----------------------------------------------------------------------------
update public.categories set sort_order = case name
  when 'Drinks' then 10
  when 'Swallow' then 20
  when 'Soups' then 30
  when 'Main Course' then 40
  when 'Sides' then 50
  when 'Grills & Pepper Soups' then 60
  else sort_order end;

commit;
