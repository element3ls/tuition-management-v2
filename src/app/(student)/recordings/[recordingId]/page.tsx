import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeading } from "@/components/layout/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStudentAccess } from "@/lib/auth/session";
import { logActivityEvent } from "@/lib/activity/log";
import { canAccessResource } from "@/lib/permissions";
import { bySortOrderThenName } from "@/lib/sorting";
import { getAppData } from "@/server/data/app-data";
import { StudentVideoPlayer } from "@/app/(student)/recordings/[recordingId]/student-video-player";

export default async function RecordingPage({ params }: { params: Promise<{ recordingId: string }> }) {
  const { recordingId } = await params;
  const { user } = await requireStudentAccess();
  const data = await getAppData();
  const recording = data.recordings.find((item) => item.id === recordingId);

  if (!recording) notFound();

  const allowed = await canAccessResource({ userId: user.id, resourceType: "recording", resourceId: recordingId, permission: "view" }, data);
  if (!allowed) return <PageHeading title="Access denied" description="You do not have access to this recording." />;

  await logActivityEvent({
    userId: user.id,
    eventType: "recording_viewed",
    resourceType: "recording",
    resourceId: recordingId,
    metadata: { youtube_video_id: recording.youtube_video_id }
  });

  const materials = [];
  for (const material of data.solutionMaterials.filter((item) => item.chapter_id === recording.chapter_id && item.status === "published")) {
    const materialAllowed = await canAccessResource(
      { userId: user.id, resourceType: "solution_material", resourceId: material.id, permission: "view" },
      data
    );
    if (materialAllowed) materials.push(material);
  }
  materials.sort(bySortOrderThenName);

  const chapter = data.chapters.find((item) => item.id === recording.chapter_id);

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: recording.title },
        ]}
      />
      <PageHeading title={recording.title} description={chapter ? `Chapter: ${chapter.title}` : recording.description} />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardContent className="p-0">
            <StudentVideoPlayer videoId={recording.youtube_video_id} title={recording.title} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Related materials</CardTitle>
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
      {recording.transcript_text ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
          </CardHeader>
          <CardContent className="max-h-40 overflow-y-auto">
            <p className="whitespace-pre-wrap text-sm">{recording.transcript_text}</p>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
