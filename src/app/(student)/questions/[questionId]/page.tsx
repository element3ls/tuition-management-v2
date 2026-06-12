import Link from "next/link";
import { notFound } from "next/navigation";
import { IconFileText, IconVideo } from "@tabler/icons-react";
import { PageHeading } from "@/components/layout/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStudentAccess } from "@/lib/auth/session";
import { canAccessResource } from "@/lib/permissions";
import { bySortOrderThenName } from "@/lib/sorting";
import { getAppData } from "@/server/data/app-data";

export default async function QuestionPage({ params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params;
  const { user } = await requireStudentAccess();
  const data = await getAppData();
  const question = data.questions.find((item) => item.id === questionId);

  if (!question) notFound();

  const allowed = await canAccessResource({ userId: user.id, resourceType: "question", resourceId: questionId, permission: "view" }, data);
  if (!allowed) return <PageHeading title="Access denied" description="You do not have access to this question." />;

  const chapter = data.chapters.find((ch) => ch.id === question.chapter_id);
  const subject = chapter ? data.subjects.find((s) => s.id === chapter.subject_id) : null;
  const year = subject ? data.years.find((y) => y.id === subject.year_id) : null;

  const recordings = data.recordings.filter((recording) => recording.question_id === questionId && recording.status === "published").sort(bySortOrderThenName);
  const materials = data.solutionMaterials.filter((material) => material.question_id === questionId && material.status === "published").sort(bySortOrderThenName);

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
        {chapter ? (
          <>
            <Link href={`/chapters/${chapter.id}`} className="font-medium text-primary hover:underline">
              {chapter.title}
            </Link>
            <span className="text-muted-foreground">/</span>
          </>
        ) : null}
        <span className="font-medium text-foreground">{question.title}</span>
      </nav>

      <PageHeading eyebrow={chapter?.title} title={question.title} description={question.description ?? undefined} />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <IconFileText className="size-4 text-primary" />
            Question
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground">{question.question_text}</p>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
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
                  <div className="font-medium">{recording.title}</div>
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
                <span className="font-medium">{material.title}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
