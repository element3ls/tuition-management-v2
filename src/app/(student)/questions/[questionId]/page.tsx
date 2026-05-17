import Link from "next/link";
import { notFound } from "next/navigation";
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

  const recordings = data.recordings.filter((recording) => recording.question_id === questionId && recording.status === "published").sort(bySortOrderThenName);
  const materials = data.solutionMaterials.filter((material) => material.question_id === questionId && material.status === "published").sort(bySortOrderThenName);

  return (
    <>
      <PageHeading title={question.title} description={question.description} />
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Question</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{question.question_text}</p>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
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
                {material.title}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
