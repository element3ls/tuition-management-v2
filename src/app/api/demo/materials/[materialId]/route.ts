import { NextResponse } from "next/server";
import { requireStudentAccess } from "@/lib/auth/session";
import { canAccessResource } from "@/lib/permissions";
import { getAppData } from "@/server/data/app-data";

export async function GET(_: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const { materialId } = await params;
  const { user } = await requireStudentAccess();
  const data = await getAppData();
  const material = data.solutionMaterials.find((item) => item.id === materialId);

  if (!material) {
    return new NextResponse("Not found", { status: 404 });
  }

  const allowed = await canAccessResource(
    { userId: user.id, resourceType: "solution_material", resourceId: materialId, permission: "view" },
    data
  );

  if (!allowed) {
    return new NextResponse("Access denied", { status: 403 });
  }

  return new NextResponse(`Demo material placeholder: ${material.title}\nFile: ${material.file_name}\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `inline; filename="${material.file_name}.txt"`
    }
  });
}
