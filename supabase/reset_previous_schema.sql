-- Run ONCE in the Supabase SQL Editor for project "Calabar Taseee" (kpapjsenwfudszphtflf),
-- BEFORE 01_schema.sql. It removes the earlier, incompatible schema.
-- That project currently has no users, menu items, feedback or orders.
drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.order_items, public.orders, public.activity_logs, public.feedback,
  public.shifts, public.menu_items, public.categories, public.opening_hours,
  public.user_roles, public.profiles cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public."current_role"() cascade;
drop type if exists public.order_status, public.order_type, public.shift_status, public.user_role cascade;
