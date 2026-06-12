import Link from "next/link";
import { IconFileText, IconVideo } from "@tabler/icons-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeading } from "@/components/layout/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireStudentAccess } from "@/lib/auth/session";
import { getAccessibleContentTree, getAccessibleResourceIds } from "@/lib/permissions";
import { byCreatedDescThenId } from "@/lib/sorting";
import { getAppData } from "@/server/data/app-data";

export default async function DashboardPage() {
  const { user } = await requireStudentAccess();
  const data = await getAppData();
  const tree = await getAccessibleContentTree(user.id, data);
  const recordingIds = new Set(await getAccessibleResourceIds({ userId: user.id, resourceType: "recording", permission: "view" }, data));
  const materialIds = new Set(await getAccessibleResourceIds({ userId: user.id, resourceType: "solution_material", permission: "view" }, data));
  const examIds = new Set(await getAccessibleResourceIds({ userId: user.id, resourceType: "exam", permission: "view" }, data));
  const recordings = data.recordings.filter((recording) => recordingIds.has(recording.id)).sort(byCreatedDescThenId).slice(0, 5);
  const materials = data.solutionMaterials.filter((material) => materialIds.has(material.id)).sort(byCreatedDescThenId).slice(0, 5);
  const exams = data.exams.filter((exam) => examIds.has(exam.id)).sort(byCreatedDescThenId).slice(0, 5);

  return (
    <>
      <PageHeading title="Dashboard" description="Assigned subjects, exams, recent recordings, solution materials, and search." />
      <form className="mb-6 flex gap-2" action="/search">
        <Input name="q" placeholder="Search assigned chapters, questions, exams, recordings, and materials" />
        <Button type="submit">Search</Button>
      </form>
      {tree.years.length === 0 && exams.length === 0 ? (
        <EmptyState title="No assigned content" description="Ask your admin to add you to a group or grant direct access." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {tree.years.length > 0 ? (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Assigned subjects</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {tree.years.map((year) => (
                  <div key={year.id} className="rounded-md border p-4">
                    <Link className="font-semibold hover:text-primary" href={`/years/${year.id}`}>
                      {year.name}
                    </Link>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {year.subjects.map((subject) => (
                        <Link key={subject.id} href={`/subjects/${subject.id}`}>
                          <Badge variant="brand">{subject.name}</Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
          <Card className={tree.years.length > 0 ? "" : "lg:col-span-2"}>
            <CardHeader>
              <CardTitle>Exams</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {exams.map((exam) => (
                <Link key={exam.id} href={`/exams/${exam.id}`} className="rounded-md border p-3 hover:bg-muted">
                  <span className="block font-medium">{exam.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {data.subjects.find((subject) => subject.id === exam.subject_id)?.name ?? "Assigned exam"}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent recordings</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {recordings.map((recording) => (
                <Link key={recording.id} href={`/recordings/${recording.id}`} className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded bg-secondary text-secondary-foreground">
                    <IconVideo className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium">{recording.title}</span>
                    <span className="font-mono text-xs text-muted-foreground">{Math.round((recording.duration_seconds ?? 0) / 60)} min</span>
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Recent solution materials</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {materials.map((material) => (
                <Link key={material.id} href={`/materials/${material.id}`} className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded bg-secondary text-secondary-foreground">
                    <IconFileText className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium">{material.title}</span>
                    <span className="font-mono text-xs text-muted-foreground">{material.file_name}</span>
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
