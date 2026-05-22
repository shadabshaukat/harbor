-- HarborLedger multi-tenant schema
create extension if not exists pgcrypto;

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  region text not null check (region in ('us', 'eu')),
  created_at timestamptz not null default now()
);

create table if not exists users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'cashier', 'kitchen')),
  created_at timestamptz not null default now()
);

create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  country_code text not null,
  timezone text not null,
  created_at timestamptz not null default now()
);

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  sku text not null,
  name text not null,
  quantity_on_hand integer not null default 0,
  reorder_threshold integer not null default 10,
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  status text not null check (status in ('open', 'paid', 'void')),
  total_cents bigint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists shift_closures (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  closed_by uuid not null references auth.users(id),
  gross_sales_cents bigint not null default 0,
  cash_variance_cents bigint not null default 0,
  closed_at timestamptz not null default now()
);

alter table users_profile enable row level security;
alter table stores enable row level security;
alter table inventory_items enable row level security;
alter table orders enable row level security;
alter table shift_closures enable row level security;

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
as $$
  select tenant_id from users_profile where id = auth.uid()
$$;

create policy "Users can view own profile"
on users_profile for select
using (id = auth.uid());

create policy "Tenant scoped store access"
on stores for all
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "Tenant scoped inventory access"
on inventory_items for all
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "Tenant scoped orders access"
on orders for all
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "Tenant scoped shift closure access"
on shift_closures for all
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());
