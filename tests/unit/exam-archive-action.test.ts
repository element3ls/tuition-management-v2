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

const { archiveExamAction, unarchiveExamAction, unpublishExamAction } = await import("@/features/admin/actions");

function formDataForExam() {
  const formData = new FormData();
  formData.set("exam_id", demoIds.exam);
  return formData;
}

function mockAdminTables(exam: Record<string, unknown>, archiveLog: Record<string, unknown> | null = null) {
  const examSingle = vi.fn().mockResolvedValue({ data: exam, error: null });
  const examEqAfterSelect = vi.fn(() => ({ single: examSingle }));
  const examSelect = vi.fn(() => ({ eq: examEqAfterSelect }));
  const eqAfterUpdate = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq: eqAfterUpdate }));

  const auditMaybeSingle = vi.fn().mockResolvedValue({ data: archiveLog, error: null });
  const auditLimit = vi.fn(() => ({ maybeSingle: auditMaybeSingle }));
  const auditOrder = vi.fn(() => ({ limit: auditLimit }));
  const auditEqAction = vi.fn(() => ({ order: auditOrder }));
  const auditEqResourceId = vi.fn(() => ({ eq: auditEqAction }));
  const auditEqResourceType = vi.fn(() => ({ eq: auditEqResourceId }));
  const auditSelect = vi.fn(() => ({ eq: auditEqResourceType }));

  const from = vi.fn((table: string) => {
    if (table === "audit_logs") return { select: auditSelect };
    return { select: examSelect, update };
  });

  mocks.createAdminClient.mockReturnValue({ from });

  return { from, examSelect, update, eqAfterUpdate, auditSelect };
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
    const table = mockAdminTables(exam);

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
    const table = mockAdminTables({
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

describe("unarchiveExamAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminAccess.mockResolvedValue({ user: { id: demoIds.admin }, roles: ["admin"] });
    mocks.isDemoMode.mockReturnValue(false);
    mocks.isSupabaseConfigured.mockReturnValue(true);
  });

  it("restores an archived exam to the status captured by the archive audit log", async () => {
    const exam = {
      id: demoIds.exam,
      title: "Linear Equations Practice Exam",
      status: "archived",
      processing_status: "completed",
      published_at: "2026-06-24T08:00:00.000Z"
    };
    const table = mockAdminTables(exam, { before_data: { status: "published" } });

    await expect(unarchiveExamAction(formDataForExam())).rejects.toThrow("redirect:/admin/exams?success=Exam%20unarchived");

    expect(table.update).toHaveBeenCalledWith({ status: "published" });
    expect(table.eqAfterUpdate).toHaveBeenCalledWith("id", demoIds.exam);
    expect(mocks.logAudit).toHaveBeenCalledWith({
      actorId: demoIds.admin,
      action: "exam_unarchived",
      resourceType: "exam",
      resourceId: demoIds.exam,
      beforeData: exam,
      afterData: { status: "published" }
    });
  });

  it("falls back to review for archived exams without previous status history", async () => {
    const table = mockAdminTables(
      {
        id: demoIds.exam,
        status: "archived",
        processing_status: "completed",
        published_at: null
      },
      null
    );

    await expect(unarchiveExamAction(formDataForExam())).rejects.toThrow("redirect:/admin/exams?success=Exam%20unarchived");

    expect(table.update).toHaveBeenCalledWith({ status: "review" });
  });
});

describe("unpublishExamAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminAccess.mockResolvedValue({ user: { id: demoIds.admin }, roles: ["admin"] });
    mocks.isDemoMode.mockReturnValue(false);
    mocks.isSupabaseConfigured.mockReturnValue(true);
  });

  it("returns a published exam to review and records an audit event", async () => {
    const exam = {
      id: demoIds.exam,
      title: "Linear Equations Practice Exam",
      status: "published",
      processing_status: "completed",
      published_at: "2026-06-24T08:00:00.000Z"
    };
    const table = mockAdminTables(exam);

    await expect(unpublishExamAction(formDataForExam())).rejects.toThrow("redirect:/admin/exams?success=Exam%20unpublished");

    expect(table.update).toHaveBeenCalledWith({ status: "review" });
    expect(table.eqAfterUpdate).toHaveBeenCalledWith("id", demoIds.exam);
    expect(mocks.logAudit).toHaveBeenCalledWith({
      actorId: demoIds.admin,
      action: "exam_unpublished",
      resourceType: "exam",
      resourceId: demoIds.exam,
      beforeData: exam,
      afterData: { status: "review" }
    });
  });

  it("does not change an exam that is already unpublished", async () => {
    const table = mockAdminTables({
      id: demoIds.exam,
      status: "review",
      processing_status: "completed"
    });

    await expect(unpublishExamAction(formDataForExam())).rejects.toThrow(
      "redirect:/admin/exams?success=Exam%20is%20already%20unpublished"
    );

    expect(table.update).not.toHaveBeenCalled();
    expect(mocks.logAudit).not.toHaveBeenCalled();
  });
});
