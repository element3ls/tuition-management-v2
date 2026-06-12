import Link from "next/link";
import { notFound } from "next/navigation";
import { IconBook2 } from "@tabler/icons-react";
import { PageHeading } from "@/components/layout/page-heading";
import { Card, CardContent } from "@/components/ui/card";
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
      <nav className="mb-4 flex items-center gap-1.5 text-sm flex-wrap">
        <Link href="/dashboard" className="font-medium text-primary hover:underline">
          Dashboard
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium text-foreground">{year.name}</span>
      </nav>

      <PageHeading eyebrow={year.name} title={year.name} description={year.description ?? "Your assigned subjects for this year."} />

      <div className="grid gap-3 sm:grid-cols-2">
        {subjects.map((subject) => (
          <Card key={subject.id}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-secondary">
                  <IconBook2 className="size-[17px] text-primary" />
                </span>
                <div>
                  <Link href={`/subjects/${subject.id}`} className="text-sm font-semibold leading-snug text-foreground hover:text-primary hover:underline">
                    {subject.name}
                  </Link>
                  {subject.description ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{subject.description}</p> : null}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
