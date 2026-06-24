import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { IconArchive, IconArchiveOff, IconEyeOff, IconStatusChange } from "@tabler/icons-react";
import { AdminDialog, CreateButton, EmptyTable, StatusBadge } from "@/components/admin/admin-ui";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeading } from "@/components/layout/page-heading";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { archiveExamAction, unarchiveExamAction, unpublishExamAction } from "@/features/admin/actions";
import { isSupabaseConfigured } from "@/lib/env";
import { getAppData } from "@/server/data/app-data";
import { ExamUploadForm } from "@/app/(admin)/admin/exams/exam-upload-form";

type ExamListItem = Awaited<ReturnType<typeof getAppData>>["exams"][number];

function ExamStatusDialog({ exam }: { exam: ExamListItem }) {
  const isProcessing = exam.processing_status === "processing";

  return (
    <AdminDialog
      title="Change exam status"
      description="Choose how this exam should appear in admin records and student views."
      trigger={
        <Button type="button" variant="outline" size="sm" className="min-w-24">
          <IconStatusChange className="size-3.5" />
          Status
        </Button>
      }
    >
      <div className="grid gap-4">
        {exam.status === "published" ? (
          <form action={unpublishExamAction} className="grid gap-3" data-mutation-form>
            <input name="exam_id" type="hidden" value={exam.id} />
            <p className="rounded-md border border-border bg-muted/35 p-3 text-sm text-muted-foreground">
              Unpublish <span className="font-semibold text-foreground">{exam.title}</span>? It will be hidden from
              students and returned to review.
            </p>
            <Button type="submit" variant="outline">
              <IconEyeOff className="size-4" />
              Unpublish exam
            </Button>
          </form>
        ) : null}

        {exam.status === "archived" ? (
          <form action={unarchiveExamAction} className="grid gap-4" data-mutation-form>
            <input name="exam_id" type="hidden" value={exam.id} />
            <p className="rounded-md border border-border bg-muted/35 p-3 text-sm text-muted-foreground">
              Unarchive <span className="font-semibold text-foreground">{exam.title}</span>? If it was published before
              archiving, it will become visible to authorized students again.
            </p>
            <Button type="submit">
              <IconArchiveOff className="size-4" />
              Unarchive exam
            </Button>
          </form>
        ) : (
          <form action={archiveExamAction} className="grid gap-3" data-mutation-form>
            <input name="exam_id" type="hidden" value={exam.id} />
            <p className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-muted-foreground">
              Archive <span className="font-semibold text-foreground">{exam.title}</span>? You can keep the record for
              review, but students will no longer be able to open it.
            </p>
            {isProcessing ? (
              <Alert variant="destructive">Wait for AI processing to finish before archiving this exam.</Alert>
            ) : null}
            <Button type="submit" variant="destructive" disabled={isProcessing}>
              <IconArchive className="size-4" />
              Archive exam
            </Button>
          </form>
        )}
      </div>
    </AdminDialog>
  );
}

export default async function ExamsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const [data, params] = await Promise.all([getAppData(), searchParams]);

  return (
    <>
      <Breadcrumb items={[{ label: "Admin", href: "/admin" }, { label: "Exams" }]} />
      <PageHeading
        title="Exam intake"
        description="Upload source PDFs, generate draft answers, review and publish approved Q&A."
        actions={
          <AdminDialog
            title="Create exam"
            description="Source files stay private. Only reviewed question and answer content is released."
            trigger={<CreateButton disabled={!isSupabaseConfigured()}>Upload exam</CreateButton>}
          >
            <ExamUploadForm subjects={data.subjects} chapters={data.chapters} />
          </AdminDialog>
        }
      />
      {!isSupabaseConfigured() ? (
        <Alert className="mb-4">Supabase is not configured. The demo exam can be reviewed, but new PDF uploads are disabled.</Alert>
      ) : null}
      {params.error ? <Alert variant="destructive" className="mb-4">{params.error}</Alert> : null}
      {params.success ? <Alert className="mb-4">{params.success}</Alert> : null}
      <div className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Exam</TableHead>
              <TableHead>Coverage</TableHead>
              <TableHead>Questions</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.exams.length === 0 ? <EmptyTable colSpan={6} label="No exams uploaded yet." /> : null}
            {data.exams.map((exam) => {
              const subject = data.subjects.find((item) => item.id === exam.subject_id);
              const chapterIds = data.examChapters
                .filter((link) => link.exam_id === exam.id)
                .map((link) => link.chapter_id);
              const chapterTitles = data.chapters
                .filter((chapter) => chapterIds.includes(chapter.id))
                .map((chapter) => chapter.title);
              const questionCount = data.examQuestions.filter((question) => question.exam_id === exam.id).length;
              return (
                <TableRow key={exam.id}>
                  <TableCell>
                    <div className="font-medium">{exam.title}</div>
                    <div className="text-xs text-muted-foreground">{exam.intake_mode.replaceAll("_", " ")}</div>
                    {exam.source_file_name ? (
                      <div className="font-mono text-xs text-muted-foreground">{exam.source_file_name}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{subject?.name ?? "Unknown subject"}</div>
                    <div className="text-xs text-muted-foreground">
                      {chapterTitles.length > 0 ? chapterTitles.join(", ") : "No chapter coverage"}
                    </div>
                  </TableCell>
                  <TableCell>{questionCount}</TableCell>
                  <TableCell>{formatDistanceToNow(new Date(exam.updated_at), { addSuffix: true })}</TableCell>
                  <TableCell><StatusBadge status={exam.status} /></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button render={<Link href={`/admin/exams/${exam.id}`} />} nativeButton={false} variant="outline" size="sm">
                        Review
                      </Button>
                      <ExamStatusDialog exam={exam} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
