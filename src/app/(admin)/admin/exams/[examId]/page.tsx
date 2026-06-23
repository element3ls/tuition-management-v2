import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
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
  const assets = data.examAssets.filter((asset) => asset.exam_id === exam.id);
  const hasSourcePdf = assets.some(
    (asset) => asset.role === "source_pdf" && asset.variant === "raw" && asset.upload_status === "ready"
  );
  const canProcess = exam.intake_mode !== "handwritten_images" && !["published", "archived"].includes(exam.status);
  const canReview = exam.status === "review" || exam.status === "published";

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Exams", href: "/admin/exams" },
          { label: exam.title },
        ]}
      />
      <PageHeading title={exam.title} description={exam.description ?? `Exam under ${subject?.name ?? "unknown subject"}`} />
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <StatusBadge status={exam.status} />
        <span className="text-muted-foreground">Mode: {exam.intake_mode.replaceAll("_", " ")}</span>
        {exam.source_file_name ? <span className="text-muted-foreground">{exam.source_file_name}</span> : null}
        <span className="text-muted-foreground">Subject: {subject?.name ?? "Unknown"}</span>
        <span className="text-muted-foreground">
          Chapters: {chapterTitles.length > 0 ? chapterTitles.join(", ") : "None"}
        </span>
        {exam.ai_model ? <span className="text-muted-foreground">Model: {exam.ai_model}</span> : null}
      </div>
      {exam.ai_error ? <Alert variant="destructive" className="mb-4">{exam.ai_error}</Alert> : null}
      {canProcess ? (
        <Card className="mb-4">
          <CardHeader><CardTitle>AI processing</CardTitle></CardHeader>
          <CardContent>
            <ExamProcessingControls
              examId={exam.id}
              intakeMode={exam.intake_mode}
              initialStatus={exam.processing_status}
            />
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-5">
        {canReview ? (
          <div className="grid content-start gap-4">
            <div>
              <h2 className="text-lg font-semibold">Questions and worked answers</h2>
              <p className="text-sm text-muted-foreground">
                Review every item and attached visual. The student view supports Markdown, sanitized HTML, KaTeX, and images.
              </p>
            </div>
            <ExamReviewEditor
              examId={exam.id}
              intakeMode={exam.intake_mode}
              examTitle={exam.title}
              examDescription={exam.description}
              questions={questions}
              assets={assets}
              published={exam.status === "published"}
              hasSourcePdf={hasSourcePdf}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
