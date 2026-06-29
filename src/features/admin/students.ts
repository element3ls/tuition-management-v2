import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit/log";
import { studentAccountInputSchema, studentCreatedAuditData, type StudentAccountInput } from "@/features/admin/student-import";

type AdminClient = ReturnType<typeof createAdminClient>;

export type StudentAccountCreationOptions = {
  organizationId: string;
  actorId: string;
  studentRoleId: string;
  supabase: AdminClient;
  writeAudit?: typeof logAudit;
};

export type StudentAccountCreationResult =
  | { status: "created"; userId: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

function isExistingAuthUserError(error: { code?: string } | null) {
  return error?.code === "email_exists" || error?.code === "user_already_exists";
}

async function cleanupCreatedUser(supabase: AdminClient, userId: string) {
  const { error } = await supabase.auth.admin.deleteUser(userId);
  return error;
}

export async function createStudentAccount(
  input: StudentAccountInput,
  options: StudentAccountCreationOptions
): Promise<StudentAccountCreationResult> {
  const parsed = studentAccountInputSchema.parse(input);
  const { organizationId, actorId, studentRoleId, supabase, writeAudit = logAudit } = options;

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: parsed.email,
    password: parsed.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.full_name }
  });

  if (isExistingAuthUserError(createError)) {
    return { status: "skipped", reason: "Email already exists." };
  }

  if (createError || !created.user) {
    console.error("Could not create student Auth user", { email: parsed.email, error: createError?.message });
    return { status: "failed", reason: "Student Auth user could not be created." };
  }

  const profileInsert = await supabase.from("profiles").insert({
    id: created.user.id,
    email: parsed.email,
    full_name: parsed.full_name,
    is_active: true,
    must_change_password: true
  });

  if (profileInsert.error) {
    const cleanupError = await cleanupCreatedUser(supabase, created.user.id);
    console.error("Could not create student profile", {
      email: parsed.email,
      error: profileInsert.error.message,
      cleanupError: cleanupError?.message
    });
    return { status: "failed", reason: "Student profile could not be created." };
  }

  const studentProfileInsert = await supabase.from("student_profiles").insert({
    organization_id: organizationId,
    user_id: created.user.id,
    guardian_name: parsed.guardian_name || null,
    phone: parsed.phone || null,
    notes: parsed.notes || null
  });

  if (studentProfileInsert.error) {
    const cleanupError = await cleanupCreatedUser(supabase, created.user.id);
    console.error("Could not create student-specific profile", {
      email: parsed.email,
      error: studentProfileInsert.error.message,
      cleanupError: cleanupError?.message
    });
    return { status: "failed", reason: "Student profile could not be created." };
  }

  const membershipInsert = await supabase.from("organization_memberships").insert({
    organization_id: organizationId,
    user_id: created.user.id,
    role: "student",
    status: "active"
  });

  if (membershipInsert.error) {
    const cleanupError = await cleanupCreatedUser(supabase, created.user.id);
    console.error("Could not assign student organization membership", {
      email: parsed.email,
      error: membershipInsert.error.message,
      cleanupError: cleanupError?.message
    });
    return { status: "failed", reason: "Student organization membership could not be assigned." };
  }

  const roleInsert = await supabase.from("user_roles").insert({
    user_id: created.user.id,
    role_id: studentRoleId
  });

  if (roleInsert.error) {
    const cleanupError = await cleanupCreatedUser(supabase, created.user.id);
    console.error("Could not assign student role", {
      email: parsed.email,
      error: roleInsert.error.message,
      cleanupError: cleanupError?.message
    });
    return { status: "failed", reason: "Student role could not be assigned." };
  }

  await writeAudit({
    organizationId,
    actorId,
    action: "user_created",
    resourceType: "profile",
    resourceId: created.user.id,
    afterData: studentCreatedAuditData(parsed)
  });

  return { status: "created", userId: created.user.id };
}
