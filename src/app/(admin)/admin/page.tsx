import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/layout/page-heading";
import { getAppData } from "@/server/data/app-data";
import { BookOpen, FileCheck2, FileText, Layers, Users, UserRoundCog, Video } from "lucide-react";

export default async function AdminDashboardPage() {
  const data = await getAppData();
  const cards = [
    ["Students", data.studentProfiles.length, Users],
    ["Groups", data.groups.length, UserRoundCog],
    ["Years", data.years.length, Layers],
    ["Subjects", data.subjects.length, BookOpen],
    ["Chapters", data.chapters.length, BookOpen],
    ["Recordings", data.recordings.length, Video],
    ["Solution materials", data.solutionMaterials.length, FileText],
    ["Exams", data.exams.length, FileCheck2]
  ] as const;

  return (
    <>
      <PageHeading title="Admin dashboard" description="Operate students, groups, syllabus content, recordings, materials, and access." />
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(([label, value, Icon]) => (
          <Card key={label} className="border-border/70 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
              <span className="rounded-md bg-accent p-2 text-accent-foreground">
                <Icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
