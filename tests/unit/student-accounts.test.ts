import { afterEach, describe, expect, it, vi } from "vitest";
import { createStudentAccount, type StudentAccountCreationOptions } from "@/features/admin/students";

const input = {
  full_name: "Ada Student",
  email: "ada@example.com",
  password: "password123",
  phone: "",
  guardian_name: "",
  notes: ""
};

const userId = "11111111-1111-4111-8111-111111111111";
const organizationId = "01000000-0000-4000-8000-000000000001";

type TableName = "profiles" | "student_profiles" | "organization_memberships" | "user_roles";

function createSupabaseMock(failingTable?: TableName) {
  const insert = {
    profiles: vi.fn().mockResolvedValue({ error: failingTable === "profiles" ? { message: "profile failed" } : null }),
    student_profiles: vi.fn().mockResolvedValue({ error: failingTable === "student_profiles" ? { message: "student profile failed" } : null }),
    organization_memberships: vi.fn().mockResolvedValue({
      error: failingTable === "organization_memberships" ? { message: "membership failed" } : null
    }),
    user_roles: vi.fn().mockResolvedValue({ error: failingTable === "user_roles" ? { message: "role failed" } : null })
  };
  const createUser = vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null });
  const deleteUser = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn((table: TableName) => ({ insert: insert[table] }));

  return {
    createUser,
    deleteUser,
    from,
    insert,
    supabase: {
      auth: { admin: { createUser, deleteUser } },
      from
    } as unknown as StudentAccountCreationOptions["supabase"]
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("student account creation", () => {
  it("creates a forced-password-change student without auditing the password", async () => {
    const mock = createSupabaseMock();
    const writeAudit = vi.fn().mockResolvedValue(undefined);

    await expect(
      createStudentAccount(input, {
        organizationId,
        actorId: "actor-id",
        studentRoleId: "student-role-id",
        supabase: mock.supabase,
        writeAudit
      })
    ).resolves.toEqual({ status: "created", userId });

    expect(mock.createUser).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "password123",
      email_confirm: true,
      user_metadata: { full_name: "Ada Student" }
    });
    expect(mock.insert.profiles).toHaveBeenCalledWith({
      id: userId,
      email: "ada@example.com",
      full_name: "Ada Student",
      is_active: true,
      must_change_password: true
    });
    expect(mock.insert.student_profiles).toHaveBeenCalledWith({
      organization_id: organizationId,
      user_id: userId,
      guardian_name: null,
      phone: null,
      notes: null
    });
    expect(mock.insert.organization_memberships).toHaveBeenCalledWith({
      organization_id: organizationId,
      user_id: userId,
      role: "student",
      status: "active"
    });

    const auditPayload = writeAudit.mock.calls[0][0];
    expect(auditPayload.organizationId).toBe(organizationId);
    expect(auditPayload.afterData).not.toHaveProperty("password");
    expect(auditPayload.afterData).toMatchObject({
      email: "ada@example.com",
      role: "student",
      must_change_password: true
    });
  });

  it.each<TableName>(["profiles", "student_profiles", "organization_memberships", "user_roles"])(
    "removes the Auth user when the %s write fails",
    async (failingTable) => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      const mock = createSupabaseMock(failingTable);
      const writeAudit = vi.fn().mockResolvedValue(undefined);

      const result = await createStudentAccount(input, {
        organizationId,
        actorId: "actor-id",
        studentRoleId: "student-role-id",
        supabase: mock.supabase,
        writeAudit
      });

      expect(result.status).toBe("failed");
      expect(mock.deleteUser).toHaveBeenCalledWith(userId);
      expect(writeAudit).not.toHaveBeenCalled();
    }
  );

  it("skips an email that already exists in Auth", async () => {
    const mock = createSupabaseMock();
    mock.createUser.mockResolvedValue({
      data: { user: null },
      error: { code: "email_exists", message: "already exists" }
    });

    await expect(
      createStudentAccount(input, {
        organizationId,
        actorId: "actor-id",
        studentRoleId: "student-role-id",
        supabase: mock.supabase
      })
    ).resolves.toEqual({ status: "skipped", reason: "Email already exists." });

    expect(mock.from).not.toHaveBeenCalled();
  });
});
