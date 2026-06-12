import { uploadFileToSignedUrl } from "@/lib/exams/signed-upload";
import type { ExamAsset, ExamAssetRole } from "@/types/domain";

export async function uploadExamAsset({
  examId,
  file,
  role,
  rotation = 0,
  altText = null,
  sourcePage = null,
  crop = null,
  onProgress = () => undefined
}: {
  examId: string;
  file: File;
  role: ExamAssetRole;
  rotation?: 0 | 90 | 180 | 270;
  altText?: string | null;
  sourcePage?: number | null;
  crop?: { x: number; y: number; width: number; height: number } | null;
  onProgress?: (value: number) => void;
}) {
  const prepareResponse = await fetch(`/api/admin/exams/${examId}/assets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      rotation,
      altText,
      sourcePage,
      crop
    })
  });
  const preparation = (await prepareResponse.json()) as { assetId?: string; signedUploadUrl?: string; error?: string };
  if (!prepareResponse.ok || !preparation.assetId || !preparation.signedUploadUrl) {
    throw new Error(preparation.error ?? "Could not prepare the image upload.");
  }

  await uploadFileToSignedUrl({ url: preparation.signedUploadUrl, file, onProgress });
  const completeResponse = await fetch(
    `/api/admin/exams/${examId}/assets/${preparation.assetId}/complete`,
    { method: "POST" }
  );
  const completed = (await completeResponse.json()) as { asset?: ExamAsset; error?: string };
  if (!completeResponse.ok || !completed.asset) throw new Error(completed.error ?? "Could not verify the image.");
  return completed.asset;
}
