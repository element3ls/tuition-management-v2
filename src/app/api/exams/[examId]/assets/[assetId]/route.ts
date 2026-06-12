import { NextResponse } from "next/server";
import { getCurrentUserRoles, requireAuth } from "@/lib/auth/session";
import { hasAdminRole } from "@/lib/auth/roles";
import { canAccessResource } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppData } from "@/server/data/app-data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ examId: string; assetId: string }> }
) {
  const user = await requireAuth();
  const roles = await getCurrentUserRoles();
  const { examId, assetId } = await params;
  const supabase = createAdminClient();
  const { data: asset } = await supabase
    .from("exam_assets")
    .select("exam_id, storage_bucket, storage_key, student_visible, upload_status")
    .eq("id", assetId)
    .eq("exam_id", examId)
    .single();
  if (!asset || asset.upload_status !== "ready") return NextResponse.json({ error: "Asset not found." }, { status: 404 });

  if (!hasAdminRole(roles)) {
    if (!asset.student_visible) return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    const data = await getAppData();
    const allowed = await canAccessResource(
      { userId: user.id, resourceType: "exam", resourceId: examId, permission: "view" },
      data
    );
    if (!allowed) return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  const { data, error } = await supabase.storage.from(asset.storage_bucket).createSignedUrl(asset.storage_key, 10 * 60);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "Could not open the asset." }, { status: 500 });
  }
  return NextResponse.redirect(new URL(data.signedUrl, request.url));
}
