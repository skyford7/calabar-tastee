-- =============================================================================
--  Calabar Tastee — seed data
--  File: supabase/migrations/02_seed.sql
--
--  Safe to re-run. Run after 01_schema.sql.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Primary Database Administrator
--
-- The on_auth_user_created trigger already promotes akinboludave@gmail.com to
-- 'dba' the moment that account is created/invited. This block covers the case
-- where the account was created BEFORE 01_schema.sql ran.
-- -----------------------------------------------------------------------------
do $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = public.primary_dba_email();

  if v_id is null then
    raise notice 'No auth user for % yet. Create/invite it in Authentication → Users; it will be promoted to dba automatically.',
      public.primary_dba_email();
    return;
  end if;

  insert into public.profiles (id, email, full_name)
  values (v_id, public.primary_dba_email(), 'Database Administrator')
  on conflict (id) do update set is_active = true;

  insert into public.user_roles (user_id, role)
  values (v_id, 'dba')
  on conflict (user_id) do update set role = 'dba';

  raise notice '% is now the primary dba.', public.primary_dba_email();
end;
$$;

-- -----------------------------------------------------------------------------
-- Opening hours (matches the current website: Mon–Sat 12:00–19:00, Sun closed)
-- -----------------------------------------------------------------------------
insert into public.opening_hours (id, day, day_label, open_time, close_time, is_closed) values
  (1, 'monday',    'Monday',    '12:00', '19:00', false),
  (2, 'tuesday',   'Tuesday',   '12:00', '19:00', false),
  (3, 'wednesday', 'Wednesday', '12:00', '19:00', false),
  (4, 'thursday',  'Thursday',  '12:00', '19:00', false),
  (5, 'friday',    'Friday',    '12:00', '19:00', false),
  (6, 'saturday',  'Saturday',  '12:00', '19:00', false),
  (7, 'sunday',    'Sunday',    null,    null,    true)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Menu categories (from the current website)
-- -----------------------------------------------------------------------------
insert into public.categories (name, slug, sort_order) values
  ('Soups',                 'soups',                10),
  ('Swallow',               'swallow',              20),
  ('Main Course',           'main-course',          30),
  ('Grills & Pepper Soups', 'grills-pepper-soups',  40),
  ('Sides',                 'sides',                50),
  ('Drinks',                'drinks',               60)
on conflict (name) do nothing;

commit;
