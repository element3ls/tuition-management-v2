import Link from "next/link";
import { notFound } from "next/navigation";
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

  const questions = data.questions.filter((question) => question.chapter_id === chapterId && question.status === "published").sort(bySortOrderThenName);
  const recordings = data.recordings.filter((recording) => recording.chapter_id === chapterId && recording.status === "published").sort(bySortOrderThenName);
  const materials = data.solutionMaterials.filter((material) => material.chapter_id === chapterId && material.status === "published").sort(bySortOrderThenName);

  return (
    <>
      <PageHeading title={chapter.title} description={chapter.description} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Questions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {questions.map((question) => (
              <Link key={question.id} href={`/questions/${question.id}`} className="rounded-md border p-3 hover:bg-muted">
                {question.title}
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recordings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {recordings.map((recording) => (
              <Link key={recording.id} href={`/recordings/${recording.id}`} className="rounded-md border p-3 hover:bg-muted">
                {recording.title}
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Materials</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {materials.map((material) => (
              <Link key={material.id} href={`/materials/${material.id}`} className="rounded-md border p-3 hover:bg-muted">
                {material.title} {material.is_downloadable ? <Badge>download</Badge> : null}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
