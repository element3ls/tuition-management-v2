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
  const [{ data: subject }, { data: chapters, error: chaptersError }] = await Promise.all([
    supabase.from("subjects").select("id").eq("id", parsed.data.subjectId).maybeSingle(),
    supabase.from("chapters").select("id, subject_id").in("id", parsed.data.chapterIds)
  ]);

  if (!subject) {
    return NextResponse.json({ error: "Selected subject was not found." }, { status: 400 });
  }

  if (
    chaptersError ||
    !chapters ||
    chapters.length !== parsed.data.chapterIds.length ||
    chapters.some((chapter) => chapter.subject_id !== parsed.data.subjectId)
  ) {
    return NextResponse.json({ error: "Every selected chapter must belong to the selected subject." }, { status: 400 });
  }

  const examId = crypto.randomUUID();
  const fileName = safeExamFileName(parsed.data.fileName);
  const sourceKey = `exams/${examId}/${fileName}`;
  const { error: insertError } = await supabase.from("exams").insert({
    id: examId,
    subject_id: parsed.data.subjectId,
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

  const { error: chapterLinkError } = await supabase.from("exam_chapters").insert(
    parsed.data.chapterIds.map((chapterId) => ({
      exam_id: examId,
      chapter_id: chapterId
    }))
  );

  if (chapterLinkError) {
    await supabase.from("exams").delete().eq("id", examId);
    return NextResponse.json({ error: chapterLinkError.message }, { status: 500 });
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
