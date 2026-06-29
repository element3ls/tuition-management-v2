import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/auth/session";
import { completeExamAssetUpload } from "@/lib/exams/assets";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganizationId } from "@/lib/tenancy/server";

// Compatibility endpoint for the original single-PDF upload client.
export async function POST(_: Request, { params }: { params: Promise<{ examId: string }> }) {
  const { user } = await requireAdminAccess();
  const { examId } = await params;
  const supabase = createAdminClient();
  const organizationId = await getCurrentOrganizationId();
  const { data: asset } = await supabase
    .from("exam_assets")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("exam_id", examId)
    .eq("role", "source_pdf")
    .eq("variant", "raw")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!asset) return NextResponse.json({ error: "Source PDF upload was not found." }, { status: 404 });

  try {
    await completeExamAssetUpload(examId, asset.id, user.id, organizationId);
    return NextResponse.json({ examId, status: "draft" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not complete upload." }, { status: 400 });
  }
}
