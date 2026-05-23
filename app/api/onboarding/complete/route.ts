import { z } from "zod";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { emitDebugEvent } from "@/lib/debug/events";

const onboardingSchema = z.object({
  slug: z.string().min(3).max(50),
  legal_name: z.string().min(2),
  brand_name: z.string().min(2),
  business_type: z.enum(["cafe", "restaurant", "bar", "pub", "hotel"]),
  region: z.enum(["us", "eu", "apac"]),
  store_name: z.string().min(2),
  country_code: z.string().length(2),
  timezone: z.string().min(3),
  store_code: z.string().min(2),
  full_name: z.string().min(2)
});

async function seedStarterVenue(tenantId: string) {
  const admin = createAdminClient();

  const { data: store } = await admin
    .from("stores")
    .select("id")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!store) {
    return;
  }

  await admin.from("dining_tables").upsert(
    [
      { tenant_id: tenantId, store_id: store.id, label: "T1", seats: 2, zone: "Main" },
      { tenant_id: tenantId, store_id: store.id, label: "T2", seats: 4, zone: "Main" },
      { tenant_id: tenantId, store_id: store.id, label: "T3", seats: 4, zone: "Window" },
      { tenant_id: tenantId, store_id: store.id, label: "Bar", seats: 6, zone: "Counter" },
      { tenant_id: tenantId, store_id: store.id, label: "Patio", seats: 4, zone: "Outdoor" }
    ],
    { onConflict: "store_id,label" }
  );

  await admin.from("menu_categories").upsert(
    [
      { tenant_id: tenantId, name: "Coffee", sort_order: 1 },
      { tenant_id: tenantId, name: "Brunch", sort_order: 2 },
      { tenant_id: tenantId, name: "Bakery", sort_order: 3 },
      { tenant_id: tenantId, name: "Cold Drinks", sort_order: 4 }
    ],
    { onConflict: "tenant_id,name" }
  );

  const { data: categories } = await admin
    .from("menu_categories")
    .select("id,name")
    .eq("tenant_id", tenantId);

  const categoryId = (name: string) => categories?.find((category) => category.name === name)?.id ?? null;

  await admin.from("menu_items").upsert(
    [
      {
        tenant_id: tenantId,
        category_id: categoryId("Coffee"),
        sku: "COF-001",
        name: "Flat White",
        description: "Double shot espresso with silky milk.",
        image_url: "/menu/flat-white.svg",
        base_price_cents: 520
      },
      {
        tenant_id: tenantId,
        category_id: categoryId("Brunch"),
        sku: "BRN-001",
        name: "Avo Toast",
        description: "Sourdough, avo smash, feta, and chili.",
        image_url: "/menu/avo-toast.svg",
        base_price_cents: 1450
      },
      {
        tenant_id: tenantId,
        category_id: categoryId("Bakery"),
        sku: "BAK-001",
        name: "Butter Croissant",
        description: "Fresh baked layered pastry.",
        image_url: "/menu/croissant.svg",
        base_price_cents: 640
      },
      {
        tenant_id: tenantId,
        category_id: categoryId("Cold Drinks"),
        sku: "COLD-001",
        name: "Berry Soda",
        description: "Sparkling berry and lime cooler.",
        image_url: "/menu/berry-soda.svg",
        base_price_cents: 690
      }
    ],
    { onConflict: "tenant_id,name" }
  );

  await admin.from("inventory_items").upsert(
    [
      { tenant_id: tenantId, store_id: store.id, sku: "BEAN-001", name: "House Espresso Beans", unit: "kg", quantity_on_hand: 12, reorder_threshold: 6, average_cost_cents: 2800 },
      { tenant_id: tenantId, store_id: store.id, sku: "MILK-001", name: "Whole Milk 2L", unit: "bottle", quantity_on_hand: 18, reorder_threshold: 12, average_cost_cents: 420 },
      { tenant_id: tenantId, store_id: store.id, sku: "CUPS-001", name: "Takeaway Cups", unit: "sleeve", quantity_on_hand: 24, reorder_threshold: 10, average_cost_cents: 650 }
    ],
    { onConflict: "store_id,sku" }
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = onboardingSchema.safeParse(payload);

  if (!parsed.success) {
    emitDebugEvent({
      level: "warn",
      source: "api",
      message: "Onboarding payload validation failed",
      details: { error: parsed.error.flatten() }
    });
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  emitDebugEvent({
    level: "info",
    source: "api",
    message: "Onboarding tenant creation requested",
    details: { slug: parsed.data.slug, businessType: parsed.data.business_type, region: parsed.data.region }
  });

  const { data, error } = await supabase.rpc("onboard_tenant", {
    p_slug: parsed.data.slug,
    p_legal_name: parsed.data.legal_name,
    p_brand_name: parsed.data.brand_name,
    p_business_type: parsed.data.business_type,
    p_region: parsed.data.region,
    p_store_name: parsed.data.store_name,
    p_country_code: parsed.data.country_code,
    p_timezone: parsed.data.timezone,
    p_store_code: parsed.data.store_code,
    p_full_name: parsed.data.full_name
  });

  if (error) {
    emitDebugEvent({
      level: "error",
      source: "api",
      message: "Onboarding tenant creation failed",
      details: { slug: parsed.data.slug, error: error.message }
    });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await seedStarterVenue(data);
  emitDebugEvent({
    level: "info",
    source: "api",
    message: "Onboarding tenant creation completed",
    details: { tenantId: data, slug: parsed.data.slug }
  });

  return NextResponse.json({ tenant_id: data }, { status: 201 });
}
