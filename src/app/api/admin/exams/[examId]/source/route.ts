import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/auth/session";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request, { params }: { params: Promise<{ examId: string }> }) {
  await requireAdminAccess();
  const { examId } = await params;
  if (isDemoMode() || !isSupabaseConfigured()) {
    return new NextResponse("Demo mode does not include the private source PDF.", {
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }
  const supabase = createAdminClient();
  const { data: asset } = await supabase
    .from("exam_assets")
    .select("storage_bucket, storage_key")
    .eq("exam_id", examId)
    .eq("role", "source_pdf")
    .eq("variant", "raw")
    .eq("upload_status", "ready")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!asset) return NextResponse.json({ error: "Source PDF not found." }, { status: 404 });

  const { data, error } = await supabase.storage.from(asset.storage_bucket).createSignedUrl(asset.storage_key, 10 * 60);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "Could not open the source PDF." }, { status: 500 });
  }

  return NextResponse.redirect(new URL(data.signedUrl, request.url));
}
