-- Trigger/internal functions never need to be called directly by API users.
-- (Supabase grants EXECUTE on new functions to `authenticated` by default.)
revoke execute on function
  public.guard_profiles(), public.guard_user_roles(), public.handle_new_user(),
  public.handle_user_email_change(), public.log_activity(), public.recalculate_order_total(),
  public.shifts_before_write(), public.set_updated_at(), public.categories_before_write(),
  public.menu_items_before_update(), public.audit_actor(), public.primary_dba_email()
from authenticated;
