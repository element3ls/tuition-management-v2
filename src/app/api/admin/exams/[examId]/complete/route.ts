import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/auth/session";
import { completeExamAssetUpload } from "@/lib/exams/assets";
import { createAdminClient } from "@/lib/supabase/admin";

// Compatibility endpoint for the original single-PDF upload client.
export async function POST(_: Request, { params }: { params: Promise<{ examId: string }> }) {
  const { user } = await requireAdminAccess();
  const { examId } = await params;
  const supabase = createAdminClient();
  const { data: asset } = await supabase
    .from("exam_assets")
    .select("id")
    .eq("exam_id", examId)
    .eq("role", "source_pdf")
    .eq("variant", "raw")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!asset) return NextResponse.json({ error: "Source PDF upload was not found." }, { status: 404 });

  try {
    await completeExamAssetUpload(examId, asset.id, user.id);
    return NextResponse.json({ examId, status: "draft" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not complete upload." }, { status: 400 });
  }
}
