import "server-only";

import { logAudit } from "@/lib/audit/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeExamImage } from "@/lib/exams/images";
import { getCurrentOrganizationId } from "@/lib/tenancy/server";
import {
  examAssetBucket,
  expectedAssetSignature,
  maxExamCombinedAssetBytes,
  maxExamImageCount,
  safeExamFileName
} from "@/lib/exams/validation";
import type { ExamAssetRole } from "@/types/domain";

export type PrepareExamAssetInput = {
  organizationId?: string;
  examId: string;
  actorId: string;
  role: ExamAssetRole;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sourcePage?: number | null;
  crop?: { x: number; y: number; width: number; height: number } | null;
  rotation?: 0 | 90 | 180 | 270;
  altText?: string | null;
};

export async function prepareExamAssetUpload(input: PrepareExamAssetInput) {
  const supabase = createAdminClient();
  const organizationId = input.organizationId ?? (await getCurrentOrganizationId());
  const [{ data: exam }, { data: existingAssets, error: assetsError }] = await Promise.all([
    supabase
      .from("exams")
      .select("id, status, intake_mode, organization_id")
      .eq("organization_id", organizationId)
      .eq("id", input.examId)
      .single(),
    supabase
      .from("exam_assets")
      .select("role, file_name, mime_type, size_bytes")
      .eq("organization_id", organizationId)
      .eq("exam_id", input.examId)
      .eq("variant", "raw")
      .neq("upload_status", "failed")
  ]);

  if (!exam) throw new Error("Exam not found.");
  if (exam.status === "published" || exam.status === "archived") throw new Error("This exam can no longer accept uploads.");
  if (assetsError) throw new Error(assetsError.message);
  if (input.role === "source_pdf" && exam.intake_mode === "handwritten_images") {
    throw new Error("Handwritten exams do not accept source PDFs.");
  }
  if ((input.role === "answer_html" || input.role === "html_image") && exam.intake_mode !== "teacher_html") {
    throw new Error("Teacher HTML assets are only allowed for teacher HTML exams.");
  }
  if (
    (input.role === "question_image" || input.role === "answer_image") &&
    exam.intake_mode !== "handwritten_images"
  ) {
    throw new Error("Question and answer image groups are only allowed for handwritten exams.");
  }
  if (
    (input.role === "question_visual" || input.role === "answer_visual") &&
    exam.intake_mode === "handwritten_images"
  ) {
    throw new Error("Handwritten exams keep visuals inside their question and answer images.");
  }
  if (
    input.role === "html_image" &&
    (existingAssets ?? []).some(
      (asset) => asset.role === "html_image" && asset.file_name.toLowerCase() === input.fileName.toLowerCase()
    )
  ) {
    throw new Error(`An HTML image named ${input.fileName} has already been uploaded.`);
  }

  const rawAssets = existingAssets ?? [];
  const imageCount = rawAssets.filter((asset) => asset.mime_type.startsWith("image/")).length;
  const combinedSize = rawAssets.reduce((sum, asset) => sum + Number(asset.size_bytes), 0);
  if (input.mimeType.startsWith("image/") && imageCount >= maxExamImageCount) {
    throw new Error("An exam can contain at most 100 images.");
  }
  if (combinedSize + input.sizeBytes > maxExamCombinedAssetBytes) {
    throw new Error("Exam assets exceed the 150 MB combined limit.");
  }

  const assetId = crypto.randomUUID();
  const extension =
    input.mimeType === "application/pdf"
      ? ".pdf"
      : input.mimeType === "text/html" || input.mimeType === "application/xhtml+xml"
        ? ".html"
        : undefined;
  const fileName = safeExamFileName(input.fileName, extension);
  const storageKey = `organizations/${organizationId}/exams/${input.examId}/raw/${assetId}/${fileName}`;
  const { error: insertError } = await supabase.from("exam_assets").insert({
    organization_id: organizationId,
    id: assetId,
    exam_id: input.examId,
    role: input.role,
    variant: "raw",
    storage_bucket: examAssetBucket,
    storage_key: storageKey,
    file_name: input.fileName,
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
    upload_status: "pending",
    source_page: input.sourcePage ?? null,
    crop_x: input.crop?.x ?? null,
    crop_y: input.crop?.y ?? null,
    crop_width: input.crop?.width ?? null,
    crop_height: input.crop?.height ?? null,
    rotation: input.rotation ?? 0,
    placement: "after_content",
    alt_text: input.altText ?? null,
    student_visible: false,
    uploaded_by: input.actorId
  });
  if (insertError) throw new Error(insertError.message);

  const { data, error } = await supabase.storage.from(examAssetBucket).createSignedUploadUrl(storageKey);
  if (error || !data?.signedUrl) {
    await supabase.from("exam_assets").delete().eq("organization_id", organizationId).eq("id", assetId);
    throw new Error(error?.message ?? "Could not prepare the asset upload.");
  }

  return { assetId, signedUploadUrl: data.signedUrl };
}

export async function completeExamAssetUpload(examId: string, assetId: string, actorId: string, organizationId?: string) {
  const supabase = createAdminClient();
  const activeOrganizationId = organizationId ?? (await getCurrentOrganizationId());
  const { data: asset, error: assetError } = await supabase
    .from("exam_assets")
    .select("*")
    .eq("organization_id", activeOrganizationId)
    .eq("id", assetId)
    .eq("exam_id", examId)
    .single();

  if (assetError || !asset) throw new Error("Exam asset not found.");
  if (asset.upload_status === "ready") {
    if (asset.variant === "display") return { asset };
    const { data: existingDisplay } = await supabase
      .from("exam_assets")
      .select("*")
      .eq("organization_id", activeOrganizationId)
      .eq("original_asset_id", asset.id)
      .eq("variant", "display")
      .maybeSingle();
    return { asset: existingDisplay ?? asset };
  }
  if (asset.variant !== "raw" || asset.upload_status !== "pending") throw new Error("This upload is not awaiting completion.");
  const { data: exam } = await supabase
    .from("exams")
    .select("status")
    .eq("organization_id", activeOrganizationId)
    .eq("id", examId)
    .single();
  if (!exam || exam.status === "published" || exam.status === "archived") {
    throw new Error("This exam can no longer accept completed uploads.");
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from(asset.storage_bucket)
    .createSignedUrl(asset.storage_key, 60);
  if (signedError || !signedData?.signedUrl) throw new Error(signedError?.message ?? "Uploaded file was not found.");

  const response = await fetch(signedData.signedUrl, { cache: "no-store" });
  if (!response.ok) throw new Error("Uploaded file could not be read.");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length !== Number(asset.size_bytes)) {
    await supabase.storage.from(asset.storage_bucket).remove([asset.storage_key]);
    await supabase
      .from("exam_assets")
      .update({ upload_status: "failed" })
      .eq("organization_id", activeOrganizationId)
      .eq("id", asset.id);
    throw new Error("Uploaded file size does not match the prepared upload.");
  }
  if (!expectedAssetSignature(asset.mime_type, buffer)) {
    await supabase.storage.from(asset.storage_bucket).remove([asset.storage_key]);
    await supabase
      .from("exam_assets")
      .update({ upload_status: "failed" })
      .eq("organization_id", activeOrganizationId)
      .eq("id", asset.id);
    throw new Error("Uploaded file content does not match its declared type.");
  }

  let completedAsset = asset;
  if (asset.mime_type.startsWith("image/")) {
    const normalized = await normalizeExamImage(buffer, asset.rotation);
    const displayId = crypto.randomUUID();
    const displayKey = `organizations/${activeOrganizationId}/exams/${examId}/display/${displayId}.webp`;
    const { error: displayUploadError } = await supabase.storage.from(examAssetBucket).upload(displayKey, normalized.buffer, {
      contentType: normalized.mimeType,
      cacheControl: "3600",
      upsert: false
    });
    if (displayUploadError) throw new Error(displayUploadError.message);

    const displayPayload = {
      organization_id: activeOrganizationId,
      id: displayId,
      exam_id: examId,
      question_id: asset.question_id,
      role: asset.role,
      variant: "display",
      original_asset_id: asset.id,
      storage_bucket: examAssetBucket,
      storage_key: displayKey,
      file_name: asset.file_name,
      mime_type: normalized.mimeType,
      size_bytes: normalized.buffer.length,
      upload_status: "ready",
      sort_order: asset.sort_order,
      source_page: asset.source_page,
      crop_x: asset.crop_x,
      crop_y: asset.crop_y,
      crop_width: asset.crop_width,
      crop_height: asset.crop_height,
      width: normalized.width,
      height: normalized.height,
      rotation: 0,
      placement: asset.placement ?? "after_content",
      alt_text: asset.alt_text,
      student_visible: asset.role === "html_image",
      uploaded_by: actorId
    };
    const { data: inserted, error: displayInsertError } = await supabase
      .from("exam_assets")
      .insert(displayPayload)
      .select("*")
      .single();
    if (displayInsertError || !inserted) {
      await supabase.storage.from(examAssetBucket).remove([displayKey]);
      throw new Error(displayInsertError?.message ?? "Could not save the display image.");
    }
    completedAsset = inserted;
  }

  const { error: readyError } = await supabase
    .from("exam_assets")
    .update({ upload_status: "ready" })
    .eq("organization_id", activeOrganizationId)
    .eq("id", asset.id);
  if (readyError) throw new Error(readyError.message);

  if (asset.role === "source_pdf") {
    await supabase
      .from("exams")
      .update({
        source_bucket: asset.storage_bucket,
        source_key: asset.storage_key,
        source_file_name: asset.file_name,
        source_mime_type: asset.mime_type,
        source_size_bytes: asset.size_bytes
      })
      .eq("organization_id", activeOrganizationId)
      .eq("id", examId);
  }

  await logAudit({
    organizationId: activeOrganizationId,
    actorId,
    action: "exam_asset_uploaded",
    resourceType: "exam",
    resourceId: examId,
    afterData: { asset_id: completedAsset.id, role: asset.role, file_name: asset.file_name }
  });

  return { asset: completedAsset };
}
