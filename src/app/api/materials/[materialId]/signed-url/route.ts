import { NextResponse, type NextRequest } from "next/server";
import { requireStudentAccess } from "@/lib/auth/session";
import { createMaterialSignedUrl } from "@/lib/storage/materials";
import { getAppData } from "@/server/data/app-data";

export async function GET(request: NextRequest, { params }: { params: Promise<{ materialId: string }> }) {
  const { materialId } = await params;
  const mode = request.nextUrl.searchParams.get("mode") === "download" ? "download" : "view";
  const { user } = await requireStudentAccess();
  const data = await getAppData();
  const result = await createMaterialSignedUrl({ userId: user.id, materialId, permission: mode, data });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.error === "Access denied." ? 403 : 404 });
  }

  return NextResponse.redirect(new URL(result.signedUrl, request.url));
}
