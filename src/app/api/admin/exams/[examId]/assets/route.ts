import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/auth/session";
import { prepareExamAssetUpload } from "@/lib/exams/assets";
import { examAssetUploadInputSchema } from "@/lib/exams/validation";
import { getCurrentOrganizationId } from "@/lib/tenancy/server";

export async function POST(request: Request, { params }: { params: Promise<{ examId: string }> }) {
  const { user } = await requireAdminAccess();
  const { examId } = await params;
  const organizationId = await getCurrentOrganizationId();
  const parsed = examAssetUploadInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid asset upload." }, { status: 400 });
  }

  try {
    return NextResponse.json(
      await prepareExamAssetUpload({
        organizationId,
        examId,
        actorId: user.id,
        role: parsed.data.role,
        fileName: parsed.data.fileName,
        mimeType: parsed.data.mimeType,
        sizeBytes: parsed.data.sizeBytes,
        sourcePage: "sourcePage" in parsed.data ? parsed.data.sourcePage : null,
        crop: "crop" in parsed.data ? parsed.data.crop : null,
        rotation: "rotation" in parsed.data ? parsed.data.rotation : 0,
        altText: "altText" in parsed.data ? parsed.data.altText : null
      })
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not prepare upload." }, { status: 400 });
  }
}
