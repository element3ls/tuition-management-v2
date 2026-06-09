import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <>
      <PageHeading title={subject.name} description={subject.description} />
      {exams.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Exams</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {exams.map((exam) => (
              <Card key={exam.id}>
                <CardHeader>
                  <CardTitle>
                    <Link href={`/exams/${exam.id}`}>{exam.title}</Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {exam.description ?? "Reviewed questions and worked answers"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
      <h2 className="mb-3 text-lg font-semibold">Chapters</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {chapters.map((chapter) => (
          <Card key={chapter.id}>
            <CardHeader>
              <CardTitle>
                <Link href={`/chapters/${chapter.id}`}>{chapter.title}</Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{chapter.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
