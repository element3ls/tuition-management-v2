import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import { PageHeading } from "@/components/layout/page-heading";
import { ExamQuestionList } from "@/components/content/exam-question-list";
import { ProtectedExamViewer } from "@/components/content/protected-exam-viewer";
import { requireStudentAccess } from "@/lib/auth/session";
import { logActivityEvent } from "@/lib/activity/log";
import { canAccessResource } from "@/lib/permissions";
import { getAppData } from "@/server/data/app-data";

export default async function StudentExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const { user } = await requireStudentAccess();
  const data = await getAppData();
  const exam = data.exams.find((item) => item.id === examId && item.status === "published");
  if (!exam) notFound();

  const allowed = await canAccessResource(
    { userId: user.id, resourceType: "exam", resourceId: exam.id, permission: "view" },
    data
  );
  if (!allowed) return <PageHeading title="Access denied" description="You do not have access to this exam." />;

  const questions = data.examQuestions
    .filter((question) => question.exam_id === exam.id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const assets = data.examAssets.filter(
    (asset) => asset.exam_id === exam.id && asset.variant === "display" && asset.student_visible
  );

  await logActivityEvent({
    userId: user.id,
    eventType: "exam_viewed",
    resourceType: "exam",
    resourceId: exam.id,
    metadata: { question_count: questions.length }
  });

  const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const watermark = `${user.full_name} | ${user.email} | ${timestamp} UTC`;

  return (
    <>
      <Link href="/dashboard" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <IconArrowLeft className="size-4" />
        Dashboard
      </Link>
      <PageHeading
        title={exam.title}
        description={exam.description}
        eyebrow={`${questions.length} ${questions.length === 1 ? "question" : "questions"}`}
      />
      <ProtectedExamViewer watermark={watermark}>
        <ExamQuestionList
          examId={exam.id}
          questions={questions.map((question) => ({
            id: question.id,
            questionNumber: question.question_number,
            questionText: question.question_text,
            answerText: question.answer_text,
            questionHtml: question.question_html,
            answerHtml: question.answer_html,
            questionFormat: question.question_format,
            answerFormat: question.answer_format,
            marks: question.marks,
            assets: assets
              .filter((asset) => asset.question_id === question.id)
              .map((asset) => ({
                id: asset.id,
                role: asset.role as "question_image" | "answer_image" | "question_visual" | "answer_visual",
                sortOrder: asset.sort_order,
                altText: asset.alt_text
              }))
          }))}
        />
      </ProtectedExamViewer>
    </>
  );
}
