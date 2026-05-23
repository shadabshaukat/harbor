-- Harbor consolidated build script.
-- Run this after supabase/drop_schema.sql for a clean redeploy, or on a new Supabase project.
-- Creates schema, functions, RLS policies, demo seed data, and a private menu image bucket.

create extension if not exists pgcrypto;

-- =========================
-- Core tenancy + identity
-- =========================
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  legal_name text not null,
  brand_name text not null,
  business_type text not null check (business_type in ('cafe', 'restaurant', 'bar', 'pub', 'hotel')),
  region text not null check (region in ('us', 'eu', 'apac')),
  plan_tier text not null default 'growth' check (plan_tier in ('starter', 'growth', 'enterprise')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  full_name text,
  role text not null check (role in ('owner', 'manager', 'staff', 'contractor')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  store_code text not null,
  timezone text not null,
  currency_code text not null default 'AUD',
  country_code text not null,
  address_line text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, store_code)
);

create table if not exists dining_tables (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  label text not null,
  seats integer not null default 2,
  zone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (store_id, label)
);

create table if not exists staff_shifts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  float_open_cents bigint not null default 0,
  float_close_cents bigint,
  status text not null default 'open' check (status in ('open', 'closed'))
);

create table if not exists staff_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  store_id uuid references stores(id) on delete set null,
  invited_email text not null,
  role text not null check (role in ('owner', 'manager', 'staff', 'contractor')),
  invite_code text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz not null,
  invited_by uuid not null references auth.users(id),
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Keep existing deployments aligned with the simplified Harbor role model.
alter table if exists users_profile drop constraint if exists users_profile_role_check;
alter table if exists staff_invites drop constraint if exists staff_invites_role_check;

update users_profile
set role = case
  when role in ('cashier', 'kitchen', 'bar', 'finance') then 'staff'
  else role
end
where role not in ('owner', 'manager', 'staff', 'contractor');

update staff_invites
set role = case
  when role in ('cashier', 'kitchen', 'bar', 'finance') then 'staff'
  else role
end
where role not in ('owner', 'manager', 'staff', 'contractor');

alter table users_profile
add constraint users_profile_role_check
check (role in ('owner', 'manager', 'staff', 'contractor'));

alter table staff_invites
add constraint staff_invites_role_check
check (role in ('owner', 'manager', 'staff', 'contractor'));

-- =========================
-- Catalog + menu
-- =========================
create table if not exists menu_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  category_id uuid references menu_categories(id) on delete set null,
  sku text,
  name text not null,
  description text,
  image_url text,
  base_price_cents bigint not null,
  tax_rate numeric(5,2) not null default 10.00,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists menu_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  name text not null,
  price_delta_cents bigint not null default 0,
  is_active boolean not null default true,
  unique (menu_item_id, name)
);

-- =========================
-- Inventory + procurement
-- =========================
create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  sku text not null,
  name text not null,
  unit text not null default 'ea',
  quantity_on_hand numeric(12,3) not null default 0,
  reorder_threshold numeric(12,3) not null default 0,
  average_cost_cents bigint not null default 0,
  updated_at timestamptz not null default now(),
  unique (store_id, sku)
);

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  movement_type text not null check (movement_type in ('purchase', 'sale_depletion', 'adjustment', 'waste', 'transfer_in', 'transfer_out')),
  quantity_delta numeric(12,3) not null,
  reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- =========================
-- Orders, items, payments
-- =========================
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  table_id uuid references dining_tables(id) on delete set null,
  order_number bigint generated always as identity,
  channel text not null check (channel in ('dine_in', 'takeaway', 'delivery')),
  status text not null check (status in ('open', 'sent_to_kitchen', 'ready', 'paid', 'void')),
  note text,
  subtotal_cents bigint not null default 0,
  tax_cents bigint not null default 0,
  discount_cents bigint not null default 0,
  service_charge_cents bigint not null default 0,
  total_cents bigint not null default 0,
  opened_by uuid references auth.users(id),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id) on delete restrict,
  item_name_snapshot text not null,
  unit_price_cents bigint not null,
  quantity integer not null,
  line_subtotal_cents bigint not null,
  line_tax_cents bigint not null,
  line_total_cents bigint not null,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  provider text not null,
  provider_payment_id text,
  method text not null check (method in ('cash', 'card', 'wallet', 'bank_transfer')),
  status text not null check (status in ('authorized', 'captured', 'refunded', 'failed')),
  amount_cents bigint not null,
  tip_cents bigint not null default 0,
  fee_cents bigint not null default 0,
  captured_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists shift_closures (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  shift_id uuid references staff_shifts(id) on delete set null,
  closed_by uuid not null references auth.users(id),
  gross_sales_cents bigint not null default 0,
  net_sales_cents bigint not null default 0,
  cash_expected_cents bigint not null default 0,
  cash_counted_cents bigint not null default 0,
  cash_variance_cents bigint not null default 0,
  closed_at timestamptz not null default now()
);

-- =========================
-- Helpful indexes
-- =========================
create index if not exists idx_users_profile_tenant on users_profile(tenant_id);
create index if not exists idx_staff_invites_tenant_status on staff_invites(tenant_id, status, expires_at);
create index if not exists idx_orders_tenant_store_created on orders(tenant_id, store_id, created_at desc);
create index if not exists idx_order_items_order on order_items(order_id);
create index if not exists idx_payments_order on payments(order_id);
create index if not exists idx_inventory_store_sku on inventory_items(store_id, sku);

-- =========================
-- RLS helpers
-- =========================
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
as $$
  select tenant_id from users_profile where id = auth.uid()
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
as $$
  select role from users_profile where id = auth.uid()
$$;

create or replace function public.is_tenant_manager()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_user_role() in ('owner', 'manager'), false)
$$;

-- onboarding function to create tenant + first store + owner profile
create or replace function public.onboard_tenant(
  p_slug text,
  p_legal_name text,
  p_brand_name text,
  p_business_type text,
  p_region text,
  p_store_name text,
  p_country_code text,
  p_timezone text,
  p_store_code text,
  p_full_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_tenant_id uuid;
  v_existing uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select tenant_id into v_existing from users_profile where id = v_user;
  if v_existing is not null then
    return v_existing;
  end if;

  insert into tenants(slug, legal_name, brand_name, business_type, region)
  values (p_slug, p_legal_name, p_brand_name, p_business_type, p_region)
  returning id into v_tenant_id;

  insert into users_profile(id, tenant_id, full_name, role)
  values (v_user, v_tenant_id, p_full_name, 'owner');

  insert into stores(tenant_id, name, store_code, timezone, country_code)
  values (v_tenant_id, p_store_name, p_store_code, p_timezone, p_country_code);

  return v_tenant_id;
end;
$$;

-- secure POS order creation function
create or replace function public.create_pos_order(
  p_store_id uuid,
  p_table_id uuid,
  p_channel text,
  p_note text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_tenant_id();
  v_order uuid;
  v_item jsonb;
  v_menu menu_items%rowtype;
  v_qty integer;
  v_subtotal bigint := 0;
  v_tax bigint := 0;
  v_line_subtotal bigint;
  v_line_tax bigint;
begin
  if v_tenant is null then
    raise exception 'No tenant context';
  end if;

  if not exists (select 1 from stores s where s.id = p_store_id and s.tenant_id = v_tenant) then
    raise exception 'Invalid store for tenant';
  end if;

  insert into orders(tenant_id, store_id, table_id, channel, status, note, opened_by)
  values (v_tenant, p_store_id, p_table_id, p_channel, 'sent_to_kitchen', p_note, auth.uid())
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := coalesce((v_item->>'qty')::integer, 0);
    if v_qty <= 0 then
      continue;
    end if;

    select * into v_menu from menu_items
    where id = (v_item->>'menu_item_id')::uuid and tenant_id = v_tenant and is_active = true;

    if v_menu.id is null then
      raise exception 'Invalid menu item %', v_item->>'menu_item_id';
    end if;

    v_line_subtotal := v_menu.base_price_cents * v_qty;
    v_line_tax := round((v_line_subtotal * v_menu.tax_rate) / 100.0);

    insert into order_items(
      tenant_id, store_id, order_id, menu_item_id, item_name_snapshot,
      unit_price_cents, quantity, line_subtotal_cents, line_tax_cents, line_total_cents
    )
    values (
      v_tenant, p_store_id, v_order, v_menu.id, v_menu.name,
      v_menu.base_price_cents, v_qty, v_line_subtotal, v_line_tax, v_line_subtotal + v_line_tax
    );

    v_subtotal := v_subtotal + v_line_subtotal;
    v_tax := v_tax + v_line_tax;
  end loop;

  update orders
  set subtotal_cents = v_subtotal,
      tax_cents = v_tax,
      total_cents = v_subtotal + v_tax,
      updated_at = now()
  where id = v_order;

  return v_order;
end;
$$;

revoke all on function public.onboard_tenant(text,text,text,text,text,text,text,text,text,text) from public;
revoke all on function public.create_pos_order(uuid,uuid,text,text,jsonb) from public;
grant execute on function public.onboard_tenant(text,text,text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.create_pos_order(uuid,uuid,text,text,jsonb) to authenticated;

-- =========================
-- Enable RLS
-- =========================
alter table tenants enable row level security;
alter table users_profile enable row level security;
alter table stores enable row level security;
alter table dining_tables enable row level security;
alter table staff_shifts enable row level security;
alter table staff_invites enable row level security;
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table menu_item_modifiers enable row level security;
alter table inventory_items enable row level security;
alter table inventory_movements enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table shift_closures enable row level security;

-- Generic tenant policies
drop policy if exists "tenant_select_tenants" on tenants;
drop policy if exists "self_profile_read" on users_profile;
drop policy if exists "manager_profile_write" on users_profile;
drop policy if exists "tenant_stores" on stores;
drop policy if exists "tenant_tables" on dining_tables;
drop policy if exists "tenant_shifts" on staff_shifts;
drop policy if exists "tenant_staff_invites" on staff_invites;
drop policy if exists "tenant_menu_categories" on menu_categories;
drop policy if exists "tenant_menu_items" on menu_items;
drop policy if exists "tenant_modifiers" on menu_item_modifiers;
drop policy if exists "tenant_inventory" on inventory_items;
drop policy if exists "tenant_inventory_movements" on inventory_movements;
drop policy if exists "tenant_orders" on orders;
drop policy if exists "tenant_order_items" on order_items;
drop policy if exists "tenant_payments" on payments;
drop policy if exists "tenant_shift_closures" on shift_closures;

create policy "tenant_select_tenants" on tenants for select using (id = public.current_tenant_id());

create policy "self_profile_read" on users_profile for select using (id = auth.uid() or tenant_id = public.current_tenant_id());
create policy "manager_profile_write" on users_profile for all
using (tenant_id = public.current_tenant_id() and public.is_tenant_manager())
with check (tenant_id = public.current_tenant_id() and public.is_tenant_manager());

create policy "tenant_stores" on stores for all
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "tenant_tables" on dining_tables for all
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "tenant_shifts" on staff_shifts for all
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "tenant_staff_invites" on staff_invites for all
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "tenant_menu_categories" on menu_categories for all
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "tenant_menu_items" on menu_items for all
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "tenant_modifiers" on menu_item_modifiers for all
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "tenant_inventory" on inventory_items for all
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "tenant_inventory_movements" on inventory_movements for all
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "tenant_orders" on orders for all
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "tenant_order_items" on order_items for all
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "tenant_payments" on payments for all
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "tenant_shift_closures" on shift_closures for all
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());


-- ===== Seed Data =====

-- Harbor production-style demo seed.

insert into tenants (id, slug, legal_name, brand_name, business_type, region, plan_tier)
values (
  '11111111-1111-1111-1111-111111111111',
  'harbor-demo',
  'Harbor Demo Hospitality Pty Ltd',
  'Harbor Demo',
  'cafe',
  'apac',
  'growth'
)
on conflict (slug) do nothing;

insert into stores (id, tenant_id, name, store_code, timezone, currency_code, country_code, address_line)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Harbor Circular Quay',
  'SYD-01',
  'Australia/Sydney',
  'AUD',
  'AU',
  '18 George Street, Sydney'
)
on conflict (tenant_id, store_code) do nothing;

insert into dining_tables (tenant_id, store_id, label, seats, zone)
values
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','T1',2,'Main'),
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','T2',4,'Main'),
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','T3',4,'Window'),
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','T4',6,'Window')
on conflict (store_id, label) do nothing;

insert into menu_categories (id, tenant_id, name, sort_order)
values
  ('33333333-3333-3333-3333-333333333331','11111111-1111-1111-1111-111111111111','Coffee',1),
  ('33333333-3333-3333-3333-333333333332','11111111-1111-1111-1111-111111111111','Brunch',2),
  ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','Bakery',3),
  ('33333333-3333-3333-3333-333333333334','11111111-1111-1111-1111-111111111111','Cold Drinks',4)
on conflict (tenant_id, name) do nothing;

insert into menu_items (id, tenant_id, category_id, sku, name, description, image_url, base_price_cents, tax_rate, is_active)
values
  ('44444444-4444-4444-4444-444444444441','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333331','COF-001','Flat White','Double shot espresso with silky milk.','/menu/flat-white.svg',520,10,true),
  ('44444444-4444-4444-4444-444444444442','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333334','COF-010','Cold Brew','18-hour steep with citrus notes.','/menu/cold-brew.svg',580,10,true),
  ('44444444-4444-4444-4444-444444444443','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333332','BRN-004','Avo Toast','Sourdough, avo smash, feta, chili.','/menu/avo-toast.svg',1450,10,true),
  ('44444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333332','BRN-008','Eggs Benny','Poached eggs, smoked ham, hollandaise.','/menu/eggs-benny.svg',1750,10,true),
  ('44444444-4444-4444-4444-444444444445','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','BAK-001','Butter Croissant','Fresh baked layered pastry.','/menu/croissant.svg',640,10,true),
  ('44444444-4444-4444-4444-444444444446','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333334','COLD-001','Berry Soda','Sparkling berry and lime cooler.','/menu/berry-soda.svg',690,10,true)
on conflict (tenant_id, name) do nothing;

insert into inventory_items (tenant_id, store_id, sku, name, unit, quantity_on_hand, reorder_threshold, average_cost_cents)
values
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','BEAN-001','House Espresso Beans','kg',24,10,2800),
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','MILK-001','Whole Milk 2L','bottle',8,12,420),
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','HAM-001','Smoked Ham','kg',4,3,2100)
on conflict (store_id, sku) do nothing;

-- Link your real auth user after sign-up/login:
-- insert into users_profile (id, tenant_id, full_name, role)
-- values ('<auth_user_uuid>', '11111111-1111-1111-1111-111111111111', 'Owner Name', 'owner')
-- on conflict (id) do update set tenant_id = excluded.tenant_id, role = excluded.role, full_name = excluded.full_name;

-- ===== Storage =====
-- If SUPABASE_MENU_IMAGES_BUCKET uses another value, replace menu-images below.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-images',
  'menu-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;
