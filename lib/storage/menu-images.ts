import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEnv } from "@/lib/env";

export const MENU_IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml"
];

const MENU_IMAGE_FILE_SIZE_LIMIT = 5 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60;

type StorageErrorLike = {
  message?: string;
  status?: number | string;
  statusCode?: number | string;
};

type MenuImageRecord = {
  image_url: string | null;
};

function isMissingBucketError(error: StorageErrorLike | null): boolean {
  if (!error) {
    return false;
  }

  const status = String(error.status ?? error.statusCode ?? "");
  const message = String(error.message ?? "").toLowerCase();

  return status === "404" || message.includes("not found") || message.includes("does not exist");
}

function isManagedStoragePath(value: string): boolean {
  return !(
    value.startsWith("/") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:")
  );
}

export function getMenuImagesBucketName(): string {
  return getEnv().menuImagesBucket;
}

export async function ensureMenuImagesBucket(
  admin: SupabaseClient = createAdminClient()
): Promise<string> {
  const bucketName = getMenuImagesBucketName();
  const { data: existingBucket, error: lookupError } = await admin.storage.getBucket(bucketName);

  if (existingBucket) {
    return bucketName;
  }

  if (lookupError && !isMissingBucketError(lookupError)) {
    throw new Error(`Could not inspect Supabase Storage bucket "${bucketName}": ${lookupError.message}`);
  }

  const { error: createError } = await admin.storage.createBucket(bucketName, {
    public: false,
    fileSizeLimit: MENU_IMAGE_FILE_SIZE_LIMIT,
    allowedMimeTypes: MENU_IMAGE_ALLOWED_MIME_TYPES
  });

  if (createError && !String(createError.message).toLowerCase().includes("already exists")) {
    throw new Error(`Could not create Supabase Storage bucket "${bucketName}": ${createError.message}`);
  }

  return bucketName;
}

export async function resolveMenuImageUrl(
  imageUrl: string | null,
  admin: SupabaseClient = createAdminClient()
): Promise<string | null> {
  if (!imageUrl) {
    return null;
  }

  if (!isManagedStoragePath(imageUrl)) {
    return imageUrl;
  }

  const { data, error } = await admin.storage
    .from(getMenuImagesBucketName())
    .createSignedUrl(imageUrl, SIGNED_URL_TTL_SECONDS);

  if (error) {
    return null;
  }

  return data.signedUrl;
}

export async function resolveMenuImageUrls<T extends MenuImageRecord>(items: T[]): Promise<T[]> {
  const admin = createAdminClient();

  return Promise.all(
    items.map(async (item) => ({
      ...item,
      image_url: await resolveMenuImageUrl(item.image_url, admin)
    }))
  );
}
