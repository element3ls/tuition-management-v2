import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStudentAccess } from "@/lib/auth/session";
import { canAccessResource } from "@/lib/permissions";
import { getAppData } from "@/server/data/app-data";

export default async function MaterialPage({ params }: { params: Promise<{ materialId: string }> }) {
  const { materialId } = await params;
  const { user } = await requireStudentAccess();
  const data = await getAppData();
  const material = data.solutionMaterials.find((item) => item.id === materialId);

  if (!material) notFound();

  const canView = await canAccessResource({ userId: user.id, resourceType: "solution_material", resourceId: materialId, permission: "view" }, data);
  const canDownload = await canAccessResource({ userId: user.id, resourceType: "solution_material", resourceId: materialId, permission: "download" }, data);

  if (!canView) return <PageHeading title="Access denied" description="You do not have access to this material." />;

  return (
    <>
      <PageHeading title={material.title} description={material.description} />
      <Card>
        <CardHeader>
          <CardTitle>{material.file_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">File type</dt>
              <dd>{material.mime_type}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">File size</dt>
              <dd>{Math.ceil(material.file_size_bytes / 1024)} KB</dd>
            </div>
          </dl>
          <div className="flex gap-2">
            <Link href={`/api/materials/${material.id}/signed-url?mode=view`}>
              <Button type="button">Open material</Button>
            </Link>
            {canDownload && material.is_downloadable ? (
              <Link href={`/api/materials/${material.id}/signed-url?mode=download`}>
                <Button type="button" variant="outline">
                  Download
                </Button>
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
