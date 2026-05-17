import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/layout/page-heading";
import { getAppData } from "@/server/data/app-data";

export default async function AdminDashboardPage() {
  const data = await getAppData();
  const cards = [
    ["Students", data.studentProfiles.length],
    ["Groups", data.groups.length],
    ["Years", data.years.length],
    ["Subjects", data.subjects.length],
    ["Chapters", data.chapters.length],
    ["Recordings", data.recordings.length],
    ["Solution materials", data.solutionMaterials.length]
  ] as const;

  return (
    <>
      <PageHeading title="Admin dashboard" description="Operate students, groups, syllabus content, recordings, materials, and access." />
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle>{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
