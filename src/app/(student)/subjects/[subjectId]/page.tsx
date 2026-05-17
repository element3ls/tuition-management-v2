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

  return (
    <>
      <PageHeading title={subject.name} description={subject.description} />
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
