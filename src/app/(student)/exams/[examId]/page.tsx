import { notFound } from "next/navigation";
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
    { userId: user.id, resourceType: "chapter", resourceId: exam.chapter_id, permission: "view" },
    data
  );
  if (!allowed) return <PageHeading title="Access denied" description="You do not have access to this exam." />;

  const questions = data.examQuestions
    .filter((question) => question.exam_id === exam.id)
    .sort((a, b) => a.sort_order - b.sort_order);

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
      <PageHeading title={exam.title} description={exam.description} />
      <ProtectedExamViewer watermark={watermark}>
        <ExamQuestionList
          questions={questions.map((question) => ({
            id: question.id,
            questionNumber: question.question_number,
            questionText: question.question_text,
            answerText: question.answer_text,
            marks: question.marks
          }))}
        />
      </ProtectedExamViewer>
    </>
  );
}
