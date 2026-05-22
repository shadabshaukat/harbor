-- Seed data for HarborLedger demo (run after schema.sql)

insert into tenants (id, slug, name, region)
values
  ('11111111-1111-1111-1111-111111111111', 'demo-cafe', 'Demo Cafe Group', 'eu')
on conflict (slug) do nothing;

insert into stores (id, tenant_id, name, country_code, timezone)
values
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Demo Cafe - Sydney', 'AU', 'Australia/Sydney')
on conflict do nothing;

insert into inventory_items (tenant_id, store_id, sku, name, quantity_on_hand, reorder_threshold)
values
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'BEAN-001', 'House Espresso Beans', 24, 10),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'MILK-001', 'Whole Milk 2L', 8, 12),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'SYRP-001', 'Vanilla Syrup', 5, 8)
on conflict do nothing;

insert into orders (tenant_id, store_id, status, total_cents)
values
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'open', 2250),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'paid', 4190)
on conflict do nothing;

-- after creating an auth user, link it manually:
-- insert into users_profile (id, tenant_id, role)
-- values ('<auth_user_uuid>', '11111111-1111-1111-1111-111111111111', 'owner');
