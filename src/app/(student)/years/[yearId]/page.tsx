import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStudentAccess } from "@/lib/auth/session";
import { canAccessResource } from "@/lib/permissions";
import { bySortOrderThenName } from "@/lib/sorting";
import { getAppData } from "@/server/data/app-data";

export default async function YearPage({ params }: { params: Promise<{ yearId: string }> }) {
  const { yearId } = await params;
  const { user } = await requireStudentAccess();
  const data = await getAppData();
  const year = data.years.find((item) => item.id === yearId);

  if (!year) notFound();

  const allowed = await canAccessResource({ userId: user.id, resourceType: "year", resourceId: yearId, permission: "view" }, data);
  if (!allowed) return <PageHeading title="Access denied" description="You do not have access to this year." />;

  const subjects = data.subjects
    .filter((subject) => subject.year_id === yearId)
    .filter((subject) => subject.status === "published")
    .sort(bySortOrderThenName);

  return (
    <>
      <PageHeading title={year.name} description={year.description} />
      <div className="grid gap-4 md:grid-cols-2">
        {subjects.map((subject) => (
          <Card key={subject.id}>
            <CardHeader>
              <CardTitle>
                <Link href={`/subjects/${subject.id}`}>{subject.name}</Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{subject.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
