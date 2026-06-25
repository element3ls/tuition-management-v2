import Link from "next/link";
import { notFound } from "next/navigation";
import { IconFile, IconFileTypePdf } from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
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

  const isPdf = material.mime_type === "application/pdf";

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: material.title },
        ]}
      />
      <PageHeading title={material.title} description={material.description} />
      <Card className="max-w-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className={`flex size-12 shrink-0 items-center justify-center rounded-lg ${isPdf ? "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400" : "bg-secondary text-secondary-foreground"}`}>
              {isPdf ? <IconFileTypePdf className="size-6" /> : <IconFile className="size-6" />}
            </span>
            <CardTitle>{material.file_name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 rounded-lg bg-muted p-4 text-sm">
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
