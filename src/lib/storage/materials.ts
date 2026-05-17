import "server-only";

import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { canAccessResource } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivityEvent } from "@/lib/activity/log";
import type { AppData, PermissionLevel } from "@/types/domain";

export const allowedMaterialMimeTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg"
] as const;

export const maxMaterialFileSizeBytes = 25 * 1024 * 1024;
export const signedUrlExpirySeconds = 10 * 60;

export function validateMaterialFile(input: { mimeType: string; sizeBytes: number }) {
  if (!allowedMaterialMimeTypes.includes(input.mimeType as (typeof allowedMaterialMimeTypes)[number])) {
    return "File type is not allowed.";
  }

  if (input.sizeBytes > maxMaterialFileSizeBytes) {
    return "File is larger than 25 MB.";
  }

  return null;
}

export async function createMaterialSignedUrl(input: {
  userId: string;
  materialId: string;
  permission: PermissionLevel;
  data: AppData;
}) {
  const material = input.data.solutionMaterials.find((item) => item.id === input.materialId);
  if (!material) {
    return { ok: false as const, error: "Material not found." };
  }

  if (input.permission === "download" && !material.is_downloadable) {
    return { ok: false as const, error: "Material is not downloadable." };
  }

  const allowed = await canAccessResource(
    {
      userId: input.userId,
      resourceType: "solution_material",
      resourceId: input.materialId,
      permission: input.permission
    },
    input.data
  );

  if (!allowed) {
    return { ok: false as const, error: "Access denied." };
  }

  await logActivityEvent({
    userId: input.userId,
    eventType: input.permission === "download" ? "solution_material_downloaded" : "solution_material_opened",
    resourceType: "solution_material",
    resourceId: input.materialId,
    metadata: { file_key: material.file_key }
  });

  if (isDemoMode() || !isSupabaseConfigured()) {
    return {
      ok: true as const,
      signedUrl: `/api/demo/materials/${material.id}?mode=${input.permission}`,
      expiresIn: signedUrlExpirySeconds
    };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(material.storage_bucket)
    .createSignedUrl(material.file_key, signedUrlExpirySeconds, {
      download: input.permission === "download" ? material.file_name : false
    });

  if (error || !data?.signedUrl) {
    return { ok: false as const, error: error?.message ?? "Could not create signed URL." };
  }

  return { ok: true as const, signedUrl: data.signedUrl, expiresIn: signedUrlExpirySeconds };
}
