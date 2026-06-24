import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoIds } from "@/lib/demo-data";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
  requireAdminAccess: vi.fn(),
  requireAdminOrSuperAdminAccess: vi.fn(),
  requireSuperAdminAccess: vi.fn(),
  isDemoMode: vi.fn(),
  isSupabaseConfigured: vi.fn(),
  createAdminClient: vi.fn(),
  logAudit: vi.fn()
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdminAccess: mocks.requireAdminAccess,
  requireAdminOrSuperAdminAccess: mocks.requireAdminOrSuperAdminAccess,
  requireSuperAdminAccess: mocks.requireSuperAdminAccess
}));

vi.mock("@/lib/env", () => ({
  isDemoMode: mocks.isDemoMode,
  isSupabaseConfigured: mocks.isSupabaseConfigured
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient
}));

vi.mock("@/lib/audit/log", () => ({
  logAudit: mocks.logAudit
}));

const { archiveExamAction } = await import("@/features/admin/actions");

function formDataForExam() {
  const formData = new FormData();
  formData.set("exam_id", demoIds.exam);
  return formData;
}

function mockExamTable(exam: Record<string, unknown>) {
  const single = vi.fn().mockResolvedValue({ data: exam, error: null });
  const eqAfterSelect = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq: eqAfterSelect }));
  const eqAfterUpdate = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq: eqAfterUpdate }));
  const from = vi.fn(() => ({ select, update }));

  mocks.createAdminClient.mockReturnValue({ from });

  return { from, select, update, eqAfterUpdate };
}

describe("archiveExamAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminAccess.mockResolvedValue({ user: { id: demoIds.admin }, roles: ["admin"] });
    mocks.isDemoMode.mockReturnValue(false);
    mocks.isSupabaseConfigured.mockReturnValue(true);
  });

  it("archives an exam and records an explicit audit event", async () => {
    const exam = {
      id: demoIds.exam,
      title: "Linear Equations Practice Exam",
      status: "published",
      processing_status: "completed"
    };
    const table = mockExamTable(exam);

    await expect(archiveExamAction(formDataForExam())).rejects.toThrow("redirect:/admin/exams?success=Exam%20archived");

    expect(table.update).toHaveBeenCalledWith({ status: "archived" });
    expect(table.eqAfterUpdate).toHaveBeenCalledWith("id", demoIds.exam);
    expect(mocks.logAudit).toHaveBeenCalledWith({
      actorId: demoIds.admin,
      action: "exam_archived",
      resourceType: "exam",
      resourceId: demoIds.exam,
      beforeData: exam,
      afterData: { status: "archived" }
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/exams");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/exams/${demoIds.exam}`);
  });

  it("does not archive while exam processing is active", async () => {
    const table = mockExamTable({
      id: demoIds.exam,
      status: "review",
      processing_status: "processing"
    });

    await expect(archiveExamAction(formDataForExam())).rejects.toThrow(
      "redirect:/admin/exams?error=Wait%20for%20exam%20processing%20to%20finish%20before%20archiving"
    );

    expect(table.update).not.toHaveBeenCalled();
    expect(mocks.logAudit).not.toHaveBeenCalled();
  });
});
