import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/log";
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
  if (exam.status !== "ready") {
    return NextResponse.json({ error: "Exam questions cannot be edited in the current state." }, { status: 409 });
  }

  const questions = parsed.data.questions.map((question) => ({
    id: question.id,
    question_number: question.questionNumber,
    question_text: question.questionText,
    answer_text: question.answerText,
    marks: question.marks,
    source_pages: question.sourcePages,
    review_warning: question.reviewWarning,
    sort_order: question.sortOrder
  }));
  const { error } = await supabase.rpc("save_exam_questions", {
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
