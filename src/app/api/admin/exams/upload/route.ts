import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/auth/session";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { examSourceBucket, examUploadInputSchema, safeExamFileName } from "@/lib/exams/validation";

export async function POST(request: Request) {
  const { user } = await requireAdminAccess();
  if (isDemoMode() || !isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase must be configured to upload exam PDFs." }, { status: 503 });
  }

  const parsed = examUploadInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid upload." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const examId = crypto.randomUUID();
  const fileName = safeExamFileName(parsed.data.fileName);
  const sourceKey = `exams/${examId}/${fileName}`;
  const { error: insertError } = await supabase.from("exams").insert({
    id: examId,
    chapter_id: parsed.data.chapterId,
    title: parsed.data.title,
    description: parsed.data.description || null,
    source_bucket: examSourceBucket,
    source_key: sourceKey,
    source_file_name: parsed.data.fileName,
    source_mime_type: parsed.data.mimeType,
    source_size_bytes: parsed.data.sizeBytes,
    status: "uploading",
    uploaded_by: user.id
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data, error } = await supabase.storage.from(examSourceBucket).createSignedUploadUrl(sourceKey);
  if (error || !data?.token) {
    await supabase.from("exams").delete().eq("id", examId);
    return NextResponse.json({ error: error?.message ?? "Could not prepare the upload." }, { status: 500 });
  }

  return NextResponse.json({
    examId,
    signedUploadUrl: data.signedUrl
  });
}
