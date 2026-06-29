import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/auth/session";
import { completeExamAssetUpload } from "@/lib/exams/assets";
import { getCurrentOrganizationId } from "@/lib/tenancy/server";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ examId: string; assetId: string }> }
) {
  const { user } = await requireAdminAccess();
  const { examId, assetId } = await params;
  const organizationId = await getCurrentOrganizationId();
  try {
    return NextResponse.json(await completeExamAssetUpload(examId, assetId, user.id, organizationId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not complete upload." }, { status: 400 });
  }
}
