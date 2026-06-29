import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/auth/session";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { prepareExamAssetUpload } from "@/lib/exams/assets";
import { examCreateInputSchema } from "@/lib/exams/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganizationId } from "@/lib/tenancy/server";

export async function POST(request: Request) {
  const { user } = await requireAdminAccess();
  if (isDemoMode() || !isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase must be configured to upload exams." }, { status: 503 });
  }

  const parsed = examCreateInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid exam upload." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const organizationId = await getCurrentOrganizationId();
  const [{ data: subject }, { data: chapters, error: chaptersError }] = await Promise.all([
    supabase.from("subjects").select("id").eq("organization_id", organizationId).eq("id", parsed.data.subjectId).maybeSingle(),
    supabase.from("chapters").select("id, subject_id").eq("organization_id", organizationId).in("id", parsed.data.chapterIds)
  ]);
  if (!subject) return NextResponse.json({ error: "Selected subject was not found." }, { status: 400 });
  if (
    chaptersError ||
    !chapters ||
    chapters.length !== parsed.data.chapterIds.length ||
    chapters.some((chapter) => chapter.subject_id !== parsed.data.subjectId)
  ) {
    return NextResponse.json({ error: "Every selected chapter must belong to the selected subject." }, { status: 400 });
  }

  const examId = crypto.randomUUID();
  const initialStatus = parsed.data.intakeMode === "handwritten_images" ? "review" : "draft";
  const { error: examError } = await supabase.from("exams").insert({
    organization_id: organizationId,
    id: examId,
    subject_id: parsed.data.subjectId,
    title: parsed.data.title,
    description: parsed.data.description || null,
    status: initialStatus,
    intake_mode: parsed.data.intakeMode,
    processing_status: "idle",
    uploaded_by: user.id
  });
  if (examError) return NextResponse.json({ error: examError.message }, { status: 500 });

  const { error: linksError } = await supabase.from("exam_chapters").insert(
    parsed.data.chapterIds.map((chapterId) => ({ organization_id: organizationId, exam_id: examId, chapter_id: chapterId }))
  );
  if (linksError) {
    await supabase.from("exams").delete().eq("organization_id", organizationId).eq("id", examId);
    return NextResponse.json({ error: linksError.message }, { status: 500 });
  }

  try {
    const uploads = [];
    for (const asset of parsed.data.assets) {
      const prepared = await prepareExamAssetUpload({
        organizationId,
        examId,
        actorId: user.id,
        role: asset.role,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        sourcePage: "sourcePage" in asset ? asset.sourcePage : null,
        crop: "crop" in asset ? asset.crop : null,
        rotation: "rotation" in asset ? asset.rotation : 0,
        altText: "altText" in asset ? asset.altText : null
      });
      uploads.push({ clientId: asset.clientId, ...prepared });
    }
    return NextResponse.json({ examId, status: initialStatus, uploads });
  } catch (error) {
    await supabase.from("exams").delete().eq("organization_id", organizationId).eq("id", examId);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not prepare uploads." }, { status: 500 });
  }
}
