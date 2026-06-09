import { notFound } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { StatusBadge } from "@/components/admin/admin-ui";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppData } from "@/server/data/app-data";
import { ExamProcessingControls } from "@/app/(admin)/admin/exams/exam-processing-controls";
import { ExamReviewEditor } from "@/app/(admin)/admin/exams/exam-review-editor";

export default async function ExamReviewPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const data = await getAppData();
  const exam = data.exams.find((item) => item.id === examId);
  if (!exam) notFound();

  const subject = data.subjects.find((item) => item.id === exam.subject_id);
  const chapterIds = data.examChapters
    .filter((link) => link.exam_id === exam.id)
    .map((link) => link.chapter_id);
  const chapterTitles = data.chapters
    .filter((chapter) => chapterIds.includes(chapter.id))
    .map((chapter) => chapter.title);
  const questions = data.examQuestions
    .filter((question) => question.exam_id === exam.id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const canProcess = ["uploaded", "processing", "failed", "ready"].includes(exam.status);
  const canReview = exam.status === "ready" || exam.status === "published";

  return (
    <>
      <PageHeading title={exam.title} description={exam.description ?? `Exam under ${subject?.name ?? "unknown subject"}`} />
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <StatusBadge status={exam.status} />
        <span className="text-muted-foreground">{exam.source_file_name}</span>
        <span className="text-muted-foreground">Subject: {subject?.name ?? "Unknown"}</span>
        <span className="text-muted-foreground">
          Chapters: {chapterTitles.length > 0 ? chapterTitles.join(", ") : "None"}
        </span>
        {exam.ai_model ? <span className="text-muted-foreground">Model: {exam.ai_model}</span> : null}
      </div>
      {exam.ai_error ? <Alert variant="destructive" className="mb-4">{exam.ai_error}</Alert> : null}
      {canProcess && exam.status !== "ready" ? (
        <Card className="mb-4">
          <CardHeader><CardTitle>AI processing</CardTitle></CardHeader>
          <CardContent>
            <ExamProcessingControls examId={exam.id} initialStatus={exam.status} />
          </CardContent>
        </Card>
      ) : null}
      <div className={canReview ? "grid gap-5 xl:grid-cols-[minmax(420px,0.8fr)_minmax(560px,1.2fr)]" : "grid gap-5"}>
        <Card className={canReview ? "xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)]" : ""}>
          <CardHeader><CardTitle>Staff-only source PDF</CardTitle></CardHeader>
          <CardContent className="h-[70vh] xl:h-[calc(100%-4rem)]">
            <iframe
              src={`/api/admin/exams/${exam.id}/source`}
              title={`${exam.title} source PDF`}
              className="h-full w-full rounded-md border bg-muted"
            />
          </CardContent>
        </Card>
        {canReview ? (
          <div className="grid content-start gap-4">
            <div>
              <h2 className="text-lg font-semibold">Questions and worked answers</h2>
              <p className="text-sm text-muted-foreground">
                Review every item against the source PDF. Markdown and LaTeX are supported in the student view.
              </p>
            </div>
            <ExamReviewEditor
              examId={exam.id}
              examTitle={exam.title}
              examDescription={exam.description}
              questions={questions}
              published={exam.status === "published"}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
