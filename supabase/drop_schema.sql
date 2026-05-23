-- Harbor consolidated drop script.
-- Destructive: removes Harbor app tables, RLS policies, functions, seed data,
-- and objects in the configured menu image Storage bucket.
-- It intentionally does not delete Supabase Auth users.
--
-- If SUPABASE_MENU_IMAGES_BUCKET uses another value, replace menu-images below.

--do $$
--declare
--  v_menu_bucket text := 'menu-images';
--begin
--  delete from storage.objects where bucket_id = v_menu_bucket;
--  delete from storage.buckets where id = v_menu_bucket;
--end $$;

drop table if exists public.shift_closures cascade;
drop table if exists public.payments cascade;
drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.inventory_movements cascade;
drop table if exists public.inventory_items cascade;
drop table if exists public.menu_item_modifiers cascade;
drop table if exists public.menu_items cascade;
drop table if exists public.menu_categories cascade;
drop table if exists public.staff_invites cascade;
drop table if exists public.staff_shifts cascade;
drop table if exists public.dining_tables cascade;
drop table if exists public.stores cascade;
drop table if exists public.users_profile cascade;
drop table if exists public.tenants cascade;

drop function if exists public.create_pos_order(uuid, uuid, text, text, jsonb) cascade;
drop function if exists public.onboard_tenant(text, text, text, text, text, text, text, text, text, text) cascade;
drop function if exists public.is_tenant_manager() cascade;
drop function if exists public.current_user_role() cascade;
drop function if exists public.current_tenant_id() cascade;
