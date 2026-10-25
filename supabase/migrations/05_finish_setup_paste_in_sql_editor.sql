-- =============================================================================
-- Calabar Tastee — finish setup
-- Paste this whole file into Supabase → SQL Editor → Run.  Safe to run twice.
--   1. Feedback categories (Feedback / Complaint / Menu Suggestion)
--   2. Menu category order to match calabartastee.com
--   3. Center Net (announcements + comments)
--   4. Remove old activity-log entries made by Database Administrators
-- =============================================================================

-- 1. Feedback categories
alter table public.feedback add column if not exists category text not null default 'Feedback';
alter table public.feedback drop constraint if exists feedback_category_check;
alter table public.feedback add constraint feedback_category_check
  check (category in ('Feedback', 'Complaint', 'Menu Suggestion'));
grant insert (category) on public.feedback to anon;

-- 2. Category order
update public.categories set sort_order = case name
  when 'Drinks' then 10 when 'Swallow' then 20 when 'Soups' then 30
  when 'Main Course' then 40 when 'Sides' then 50 when 'Grills & Pepper Soups' then 60
  else sort_order end;

-- 3. Center Net
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

create or replace function public.announcements_before_write()
returns trigger language plpgsql security definer set search_path = ''
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
create trigger announcements_before_write before insert or update on public.announcements
  for each row execute function public.announcements_before_write();

create or replace function public.announcement_comments_before_write()
returns trigger language plpgsql security definer set search_path = ''
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
create trigger announcement_comments_before_write before insert or update on public.announcement_comments
  for each row execute function public.announcement_comments_before_write();

revoke execute on function public.announcements_before_write() from public, anon, authenticated;
revoke execute on function public.announcement_comments_before_write() from public, anon, authenticated;

alter table public.announcements enable row level security;
alter table public.announcement_comments enable row level security;
grant select, insert, update, delete on public.announcements, public.announcement_comments to authenticated;
revoke all on public.announcements, public.announcement_comments from anon;

drop policy if exists "announcements: team reads" on public.announcements;
create policy "announcements: team reads" on public.announcements for select to authenticated
  using ((select public.is_team_member()));
drop policy if exists "announcements: team posts" on public.announcements;
create policy "announcements: team posts" on public.announcements for insert to authenticated
  with check ((select public.is_team_member()));
drop policy if exists "announcements: author or manager edits" on public.announcements;
create policy "announcements: author or manager edits" on public.announcements for update to authenticated
  using ((select public.is_team_member()) and (author_id = (select auth.uid()) or (select public.is_manager())))
  with check ((select public.is_team_member()));
drop policy if exists "announcements: author or manager deletes" on public.announcements;
create policy "announcements: author or manager deletes" on public.announcements for delete to authenticated
  using ((select public.is_team_member()) and (author_id = (select auth.uid()) or (select public.is_manager())));

drop policy if exists "comments: team reads" on public.announcement_comments;
create policy "comments: team reads" on public.announcement_comments for select to authenticated
  using ((select public.is_team_member()));
drop policy if exists "comments: team posts" on public.announcement_comments;
create policy "comments: team posts" on public.announcement_comments for insert to authenticated
  with check ((select public.is_team_member()));
drop policy if exists "comments: author edits" on public.announcement_comments;
create policy "comments: author edits" on public.announcement_comments for update to authenticated
  using ((select public.is_team_member()) and author_id = (select auth.uid()))
  with check ((select public.is_team_member()));
drop policy if exists "comments: author or manager deletes" on public.announcement_comments;
create policy "comments: author or manager deletes" on public.announcement_comments for delete to authenticated
  using ((select public.is_team_member()) and (author_id = (select auth.uid()) or (select public.is_manager())));

drop trigger if exists audit_announcements on public.announcements;
create trigger audit_announcements after insert or update or delete on public.announcements
  for each row execute function public.log_activity('id', 'title');

-- 4. Remove old Database Administrator log entries
delete from public.activity_logs
where actor_id is not null and public.role_of(actor_id) = 'dba';

select 'Setup finished' as result;
