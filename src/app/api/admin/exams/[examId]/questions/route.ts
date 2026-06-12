import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/log";
import { sanitizeExamHtml } from "@/lib/exams/html";
import { examQuestionsInputSchema } from "@/lib/exams/validation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PUT(request: Request, { params }: { params: Promise<{ examId: string }> }) {
  const { user } = await requireAdminAccess();
  const { examId } = await params;
  const parsed = examQuestionsInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid exam questions." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: exam } = await supabase.from("exams").select("status").eq("id", examId).single();
  if (!exam) return NextResponse.json({ error: "Exam not found." }, { status: 404 });
  if (exam.status !== "draft" && exam.status !== "review") {
    return NextResponse.json({ error: "Exam questions cannot be edited in the current state." }, { status: 409 });
  }

  const { data: htmlImages } = await supabase
    .from("exam_assets")
    .select("*")
    .eq("exam_id", examId)
    .eq("role", "html_image")
    .eq("variant", "display")
    .eq("upload_status", "ready");

  let questions;
  try {
    questions = parsed.data.questions.map((question) => ({
      id: question.id,
      question_number: question.questionNumber,
      question_text: question.questionText,
      answer_text: question.answerText,
      question_html: question.questionHtml ? sanitizeExamHtml(question.questionHtml, examId, htmlImages ?? []) : null,
      answer_html: question.answerHtml ? sanitizeExamHtml(question.answerHtml, examId, htmlImages ?? []) : null,
      question_format: question.questionFormat,
      answer_format: question.answerFormat,
      marks: question.marks,
      source_pages: question.sourcePages,
      review_warning: question.reviewWarning,
      requires_visual: question.requiresVisual,
      visual_not_needed: question.visualNotNeeded,
      sort_order: question.sortOrder,
      assets: question.assets.map((asset) => ({
        id: asset.id,
        role: asset.role,
        sort_order: asset.sortOrder,
        alt_text: asset.altText
      }))
    }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid exam HTML." }, { status: 400 });
  }
  const { error } = await supabase.rpc("save_exam_review", {
    p_exam_id: examId,
    p_questions: questions,
    p_actor_id: user.id,
    p_publish: false
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actorId: user.id,
    action: "exam_updated",
    resourceType: "exam",
    resourceId: examId,
    afterData: { question_count: questions.length }
  });

  return NextResponse.json({ status: "saved" });
}
