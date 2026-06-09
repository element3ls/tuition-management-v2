import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/auth/session";
import { startExamProcessing, syncExamProcessing } from "@/lib/exams/ai";

export async function POST(_: Request, { params }: { params: Promise<{ examId: string }> }) {
  const { user } = await requireAdminAccess();
  const { examId } = await params;

  try {
    return NextResponse.json(await startExamProcessing(examId, user.id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not start processing." }, { status: 400 });
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ examId: string }> }) {
  const { user } = await requireAdminAccess();
  const { examId } = await params;

  try {
    return NextResponse.json(await syncExamProcessing(examId, user.id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not refresh processing." }, { status: 400 });
  }
}
