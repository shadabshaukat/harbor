import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  ensureMenuImagesBucket,
  MENU_IMAGE_ALLOWED_MIME_TYPES
} from "@/lib/storage/menu-images";
import { emitDebugEvent } from "@/lib/debug/events";

export const runtime = "nodejs";

const allowedTypes = new Set(MENU_IMAGE_ALLOWED_MIME_TYPES);

function extensionFor(type: string): string {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "svg";
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users_profile")
    .select("tenant_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !["owner", "manager"].includes(profile.role)) {
    emitDebugEvent({
      level: "warn",
      source: "api",
      message: "Menu image upload rejected by role",
      details: { role: profile?.role ?? null, menuItemId: params.id }
    });
    return NextResponse.json({ error: "Only owners and managers can update menu images" }, { status: 403 });
  }

  const { data: menuItem } = await admin
    .from("menu_items")
    .select("id, tenant_id")
    .eq("id", params.id)
    .eq("tenant_id", profile.tenant_id)
    .maybeSingle();

  if (!menuItem) {
    emitDebugEvent({
      level: "warn",
      source: "api",
      message: "Menu image upload rejected: item not found for tenant",
      details: { menuItemId: params.id, tenantId: profile.tenant_id }
    });
    return NextResponse.json({ error: "Menu item not found for this workspace" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  }

  if (!allowedTypes.has(file.type)) {
    emitDebugEvent({
      level: "warn",
      source: "api",
      message: "Menu image upload rejected: unsupported file type",
      details: { menuItemId: menuItem.id, fileType: file.type }
    });
    return NextResponse.json({ error: "Upload a JPG, PNG, WebP, or SVG image" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be 5MB or smaller" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const path = `${profile.tenant_id}/menu/${menuItem.id}/${crypto.randomUUID()}.${extensionFor(file.type)}`;
  const bucketName = await ensureMenuImagesBucket(admin);
  emitDebugEvent({
    level: "info",
    source: "api",
    message: "Menu image upload started",
    details: { menuItemId: menuItem.id, tenantId: profile.tenant_id, bucketName, fileType: file.type, size: file.size }
  });

  const { error: uploadError } = await admin.storage
    .from(bucketName)
    .upload(path, bytes, {
      contentType: file.type,
      upsert: false
    });

  if (uploadError) {
    emitDebugEvent({
      level: "error",
      source: "api",
      message: "Menu image upload failed",
      details: { menuItemId: menuItem.id, bucketName, error: uploadError.message }
    });
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { error: updateError } = await admin
    .from("menu_items")
    .update({ image_url: path, updated_at: new Date().toISOString() })
    .eq("id", menuItem.id)
    .eq("tenant_id", profile.tenant_id);

  if (updateError) {
    emitDebugEvent({
      level: "error",
      source: "api",
      message: "Menu image database update failed",
      details: { menuItemId: menuItem.id, path, error: updateError.message }
    });
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  emitDebugEvent({
    level: "info",
    source: "api",
    message: "Menu image upload completed",
    details: { menuItemId: menuItem.id, bucketName, path }
  });

  return NextResponse.json({ image_url: path }, { status: 200 });
}
