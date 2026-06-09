import { notFound } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { RichText } from "@/components/content/rich-text";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStudentAccess } from "@/lib/auth/session";
import { logActivityEvent } from "@/lib/activity/log";
import { canAccessResource } from "@/lib/permissions";
import { getAppData } from "@/server/data/app-data";
import { ProtectedExamViewer } from "@/app/(student)/exams/[examId]/protected-exam-viewer";

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
  const watermark = `${user.full_name} • ${user.email} • ${timestamp} UTC`;

  return (
    <>
      <PageHeading title={exam.title} description={exam.description} />
      <ProtectedExamViewer watermark={watermark}>
        <div className="grid gap-5">
          {questions.map((question) => (
            <Card key={question.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>Question {question.question_number}</CardTitle>
                  {question.marks !== null ? <Badge variant="outline">{question.marks} marks</Badge> : null}
                </div>
              </CardHeader>
              <CardContent className="grid gap-5">
                <RichText>{question.question_text}</RichText>
                <section className="rounded-md border border-primary/20 bg-primary/5 p-4">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">Worked answer</h2>
                  <RichText>{question.answer_text}</RichText>
                </section>
              </CardContent>
            </Card>
          ))}
        </div>
      </ProtectedExamViewer>
    </>
  );
}
