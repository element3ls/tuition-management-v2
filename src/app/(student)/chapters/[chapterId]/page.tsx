import Link from "next/link";
import { notFound } from "next/navigation";
import { IconFileCheck, IconFileText, IconVideo } from "@tabler/icons-react";
import { PageHeading } from "@/components/layout/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStudentAccess } from "@/lib/auth/session";
import { canAccessResource } from "@/lib/permissions";
import { bySortOrderThenName } from "@/lib/sorting";
import { getAppData } from "@/server/data/app-data";

export default async function ChapterPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;
  const { user } = await requireStudentAccess();
  const data = await getAppData();
  const chapter = data.chapters.find((item) => item.id === chapterId);

  if (!chapter) notFound();

  const allowed = await canAccessResource({ userId: user.id, resourceType: "chapter", resourceId: chapterId, permission: "view" }, data);
  if (!allowed) return <PageHeading title="Access denied" description="You do not have access to this chapter." />;

  const subject = data.subjects.find((s) => s.id === chapter.subject_id);
  const year = subject ? data.years.find((y) => y.id === subject.year_id) : null;

  const questions = data.questions.filter((question) => question.chapter_id === chapterId && question.status === "published").sort(bySortOrderThenName);
  const recordings = data.recordings.filter((recording) => recording.chapter_id === chapterId && recording.status === "published").sort(bySortOrderThenName);
  const materials = data.solutionMaterials.filter((material) => material.chapter_id === chapterId && material.status === "published").sort(bySortOrderThenName);
  const linkedExamIds = new Set(
    data.examChapters.filter((link) => link.chapter_id === chapterId).map((link) => link.exam_id)
  );
  const exams = (
    await Promise.all(
      data.exams
        .filter((exam) => linkedExamIds.has(exam.id) && exam.status === "published")
        .map(async (exam) => ({
          exam,
          allowed: await canAccessResource(
            { userId: user.id, resourceType: "exam", resourceId: exam.id, permission: "view" },
            data
          )
        }))
    )
  )
    .filter((item) => item.allowed)
    .map((item) => item.exam)
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <>
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm">
        <Link href="/dashboard" className="font-medium text-primary hover:underline">
          Dashboard
        </Link>
        <span className="text-muted-foreground">/</span>
        {year ? (
          <>
            <Link href={`/years/${year.id}`} className="font-medium text-primary hover:underline">
              {year.name}
            </Link>
            <span className="text-muted-foreground">/</span>
          </>
        ) : null}
        {subject ? (
          <>
            <Link href={`/subjects/${subject.id}`} className="font-medium text-primary hover:underline">
              {subject.name}
            </Link>
            <span className="text-muted-foreground">/</span>
          </>
        ) : null}
        <span className="font-medium text-foreground">{chapter.title}</span>
      </nav>

      <PageHeading eyebrow={subject?.name} title={chapter.title} description={chapter.description ?? undefined} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <IconFileText className="size-4 text-primary" />
              Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1.5">
            {questions.length === 0 ? <p className="text-sm text-muted-foreground">No questions yet.</p> : null}
            {questions.map((question) => (
              <Link
                key={question.id}
                href={`/questions/${question.id}`}
                className="flex items-center gap-2.5 rounded-sm border border-border p-2.5 text-sm transition-colors hover:bg-muted"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-[4px] bg-secondary">
                  <IconFileText className="size-3 text-primary" />
                </span>
                <span className="font-medium">{question.title}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <IconVideo className="size-4 text-primary" />
              Recordings
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1.5">
            {recordings.length === 0 ? <p className="text-sm text-muted-foreground">No recordings yet.</p> : null}
            {recordings.map((recording) => (
              <Link
                key={recording.id}
                href={`/recordings/${recording.id}`}
                className="flex items-center gap-2.5 rounded-sm border border-border p-2.5 text-sm transition-colors hover:bg-muted"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-[4px] bg-secondary">
                  <IconVideo className="size-3 text-primary" />
                </span>
                <div className="min-w-0">
                  <div className="font-medium leading-snug">{recording.title}</div>
                  {recording.duration_seconds ? (
                    <div className="font-mono text-[11px] text-muted-foreground">{Math.floor(recording.duration_seconds / 60)} min</div>
                  ) : null}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <IconFileText className="size-4 text-primary" />
              Materials
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1.5">
            {materials.length === 0 ? <p className="text-sm text-muted-foreground">No materials yet.</p> : null}
            {materials.map((material) => (
              <Link
                key={material.id}
                href={`/materials/${material.id}`}
                className="flex items-center gap-2.5 rounded-sm border border-border p-2.5 text-sm transition-colors hover:bg-muted"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-[4px] bg-secondary">
                  <IconFileText className="size-3 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium leading-snug">{material.title}</div>
                </div>
                {material.is_downloadable ? (
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    download
                  </Badge>
                ) : null}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
      {exams.length > 0 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <IconFileCheck className="size-4 text-primary" />
              Exams
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            {exams.map((exam) => (
              <Link key={exam.id} href={`/exams/${exam.id}`} className="rounded-sm border border-border p-3 transition-colors hover:bg-muted">
                <div className="text-sm font-medium">{exam.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{exam.description ?? "Reviewed questions and worked answers"}</div>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
