import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { IconArchive, IconArchiveOff } from "@tabler/icons-react";
import { AdminDialog, CreateButton, EmptyTable, StatusBadge } from "@/components/admin/admin-ui";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeading } from "@/components/layout/page-heading";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { archiveExamAction, unarchiveExamAction } from "@/features/admin/actions";
import { isSupabaseConfigured } from "@/lib/env";
import { getAppData } from "@/server/data/app-data";
import { ExamUploadForm } from "@/app/(admin)/admin/exams/exam-upload-form";

type ExamListItem = Awaited<ReturnType<typeof getAppData>>["exams"][number];

function ArchiveExamDialog({ exam }: { exam: ExamListItem }) {
  if (exam.status === "archived") {
    return (
      <AdminDialog
        title="Unarchive exam"
        description="Restore this exam to its previous lifecycle state when possible."
        trigger={
          <Button type="button" variant="outline" size="sm">
            <IconArchiveOff className="size-3.5" />
            Unarchive
          </Button>
        }
      >
        <form action={unarchiveExamAction} className="grid gap-4" data-mutation-form>
          <input name="exam_id" type="hidden" value={exam.id} />
          <p className="rounded-md border border-border bg-muted/35 p-3 text-sm text-muted-foreground">
            Unarchive <span className="font-semibold text-foreground">{exam.title}</span>? If it was published before
            archiving, it will become visible to authorized students again.
          </p>
          <Button type="submit">
            Unarchive exam
          </Button>
        </form>
      </AdminDialog>
    );
  }

  const isProcessing = exam.processing_status === "processing";

  return (
    <AdminDialog
      title="Archive exam"
      description="This is a soft archive. The exam remains in admin records but is hidden from students."
      trigger={
        <Button type="button" variant="destructive" size="sm">
          <IconArchive className="size-3.5" />
          Archive
        </Button>
      }
    >
      <form action={archiveExamAction} className="grid gap-4" data-mutation-form>
        <input name="exam_id" type="hidden" value={exam.id} />
        <p className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-muted-foreground">
          Archive <span className="font-semibold text-foreground">{exam.title}</span>? You can keep the record for review,
          but students will no longer be able to open it.
        </p>
        {isProcessing ? (
          <Alert variant="destructive">Wait for AI processing to finish before archiving this exam.</Alert>
        ) : null}
        <Button type="submit" variant="destructive" disabled={isProcessing}>
          Archive exam
        </Button>
      </form>
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
                      <ArchiveExamDialog exam={exam} />
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
