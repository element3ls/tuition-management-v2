import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/log";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(_: Request, { params }: { params: Promise<{ examId: string }> }) {
  const { user } = await requireAdminAccess();
  const { examId } = await params;
  const supabase = createAdminClient();
  const { data: exam, error: examError } = await supabase.from("exams").select("*").eq("id", examId).single();

  if (examError || !exam) {
    return NextResponse.json({ error: "Exam not found." }, { status: 404 });
  }
  if (exam.status !== "uploading") {
    return NextResponse.json({ error: "The upload is not awaiting completion." }, { status: 409 });
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from(exam.source_bucket)
    .createSignedUrl(exam.source_key, 60);
  if (signedError || !signedData?.signedUrl) {
    return NextResponse.json({ error: signedError?.message ?? "Uploaded PDF was not found." }, { status: 400 });
  }

  const signatureResponse = await fetch(signedData.signedUrl, {
    headers: { Range: "bytes=0-4" },
    cache: "no-store"
  });
  const signature = Buffer.from(await signatureResponse.arrayBuffer()).subarray(0, 5).toString("ascii");
  if (!signatureResponse.ok || signature !== "%PDF-") {
    await supabase.storage.from(exam.source_bucket).remove([exam.source_key]);
    await supabase.from("exams").update({ status: "failed", ai_error: "Uploaded file is not a valid PDF." }).eq("id", examId);
    return NextResponse.json({ error: "Uploaded file is not a valid PDF." }, { status: 400 });
  }

  const { error: updateError } = await supabase.from("exams").update({ status: "uploaded", ai_error: null }).eq("id", examId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await logAudit({
    actorId: user.id,
    action: "exam_uploaded",
    resourceType: "exam",
    resourceId: examId,
    afterData: { file_name: exam.source_file_name, size_bytes: exam.source_size_bytes }
  });

  return NextResponse.json({ examId, status: "uploaded" });
}
