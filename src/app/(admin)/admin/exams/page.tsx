import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { AdminDialog, CreateButton, EmptyTable, StatusBadge } from "@/components/admin/admin-ui";
import { PageHeading } from "@/components/layout/page-heading";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isSupabaseConfigured } from "@/lib/env";
import { getAppData } from "@/server/data/app-data";
import { ExamUploadForm } from "@/app/(admin)/admin/exams/exam-upload-form";

export default async function ExamsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const [data, params] = await Promise.all([getAppData(), searchParams]);

  return (
    <>
      <PageHeading
        title="Exam intake"
        description="Upload staff-only source PDFs, generate draft answers, review the entire exam, and publish approved Q&A."
        actions={
          <AdminDialog
            title="Upload exam PDF"
            description="The source stays private and is never shown to students."
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
              <TableHead>Subject / coverage</TableHead>
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
                    <div className="text-xs text-muted-foreground">{exam.source_file_name}</div>
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
                  <TableCell className="text-right">
                    <Button render={<Link href={`/admin/exams/${exam.id}`} />} variant="outline" size="sm">
                      Review
                    </Button>
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
