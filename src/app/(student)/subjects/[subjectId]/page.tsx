import Link from "next/link";
import { notFound } from "next/navigation";
import { IconBook2, IconFileCheck, IconFileText } from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeading } from "@/components/layout/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { requireStudentAccess } from "@/lib/auth/session";
import { canAccessResource } from "@/lib/permissions";
import { bySortOrderThenName } from "@/lib/sorting";
import { getAppData } from "@/server/data/app-data";

export default async function SubjectPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  const { user } = await requireStudentAccess();
  const data = await getAppData();
  const subject = data.subjects.find((item) => item.id === subjectId);

  if (!subject) notFound();

  const allowed = await canAccessResource({ userId: user.id, resourceType: "subject", resourceId: subjectId, permission: "view" }, data);
  if (!allowed) return <PageHeading title="Access denied" description="You do not have access to this subject." />;

  const year = data.years.find((y) => y.id === subject.year_id);

  const chapters = data.chapters
    .filter((chapter) => chapter.subject_id === subjectId)
    .filter((chapter) => chapter.status === "published")
    .sort(bySortOrderThenName);
  const exams = (
    await Promise.all(
      data.exams
        .filter((exam) => exam.subject_id === subjectId && exam.status === "published")
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

  const questionCountByChapter = new Map(
    chapters.map((ch) => [
      ch.id,
      data.questions.filter((q) => q.chapter_id === ch.id && q.status === "published").length,
    ])
  );

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          ...(year ? [{ label: year.name, href: `/years/${year.id}` }] : []),
          { label: subject.name },
        ]}
      />
      <PageHeading eyebrow={year?.name} title={subject.name} description={subject.description ?? undefined} />

      {exams.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <IconFileCheck className="size-4 text-primary" />
            Exams
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {exams.map((exam) => (
              <Card key={exam.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-amber-50">
                      <IconFileCheck className="size-4 text-amber-600" />
                    </span>
                    <div>
                      <Link href={`/exams/${exam.id}`} className="text-sm font-medium leading-snug text-foreground hover:text-primary hover:underline">
                        {exam.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">{exam.description ?? "Reviewed questions and worked answers"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <IconBook2 className="size-4 text-primary" />
        Chapters
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {chapters.map((chapter) => (
          <Card key={chapter.id}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-secondary">
                  <IconFileText className="size-[15px] text-primary" />
                </span>
                <div>
                  <Link href={`/chapters/${chapter.id}`} className="text-sm font-medium leading-snug text-foreground hover:text-primary hover:underline">
                    {chapter.title}
                  </Link>
                  {chapter.description ? <p className="mt-1 text-xs text-muted-foreground">{chapter.description}</p> : null}
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">{questionCountByChapter.get(chapter.id) ?? 0} questions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
