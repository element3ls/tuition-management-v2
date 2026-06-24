"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdminAccess, requireAdminOrSuperAdminAccess, requireSuperAdminAccess } from "@/lib/auth/session";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { logAudit } from "@/lib/audit/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateMaterialFile } from "@/lib/storage/materials";
import {
  studentAccountInputSchema,
  studentImportBatchSize,
  studentImportRowInputSchema,
  type StudentImportResult,
  type StudentImportRowInput
} from "@/features/admin/student-import";
import { createStudentAccount } from "@/features/admin/students";

const statusSchema = z.enum(["draft", "published", "archived"]);
const examRestoreStatusSchema = z.enum(["draft", "review", "published"]);
const resourceTypeSchema = z.enum(["year", "subject", "chapter", "question", "recording", "solution_material", "exam"]);
const membershipStatusSchema = z.enum(["active", "inactive"]);
const transcriptSourceSchema = z.enum(["none", "manual", "youtube", "generated"]);
const transcriptReviewStatusSchema = z.enum(["draft", "reviewed", "approved"]);

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullableTextValue(formData: FormData, key: string) {
  const value = textValue(formData, key);
  return value.length > 0 ? value : null;
}

function booleanValue(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function numberValue(formData: FormData, key: string) {
  return Number(textValue(formData, key) || 0);
}

function nullableNumberValue(formData: FormData, key: string) {
  const value = textValue(formData, key);
  return value.length > 0 ? Number(value) : null;
}

function datetimeValue(formData: FormData, key: string) {
  const value = textValue(formData, key);
  return value.length > 0 ? new Date(value).toISOString() : null;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function demoRedirect(path: string) {
  revalidatePath(path);
  redirect(`${path}?success=Demo%20mode%20validated%20the%20form.%20Connect%20Supabase%20to%20persist%20changes.`);
}

function ensureSupabaseReady() {
  if (!isSupabaseConfigured()) {
    redirect("/admin?error=Supabase%20is%20not%20configured");
  }
}

async function roleIdFor(name: string, supabase = createAdminClient()) {
  const { data, error } = await supabase.from("roles").select("id").eq("name", name).single();
  if (error || !data) throw new Error(`Role not found: ${name}`);
  return data.id as string;
}

export async function createStudentAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const parsed = studentAccountInputSchema.parse(Object.fromEntries(formData));

  if (isDemoMode()) await demoRedirect("/admin/users");
  ensureSupabaseReady();

  const supabase = createAdminClient();
  const result = await createStudentAccount(parsed, {
    actorId: user.id,
    studentRoleId: await roleIdFor("student", supabase),
    supabase
  });

  if (result.status !== "created") {
    redirect(`/admin/users?error=${encodeURIComponent(result.reason)}`);
  }

  revalidatePath("/admin/users");
  redirect("/admin/users?success=Student%20created");
}

export async function importStudentsBatchAction(rows: StudentImportRowInput[]) {
  const { user } = await requireAdminOrSuperAdminAccess();
  if (!Array.isArray(rows) || rows.length > studentImportBatchSize) {
    throw new Error(`Import batches may contain at most ${studentImportBatchSize} rows.`);
  }

  const results: StudentImportResult[] = [];
  const parsedRows: StudentImportRowInput[] = [];
  const seenEmails = new Set<string>();

  for (const row of rows) {
    const parsed = studentImportRowInputSchema.safeParse(row);
    const email = typeof row?.email === "string" ? row.email.trim().toLowerCase() : "";

    if (!parsed.success) {
      results.push({
        rowNumber: typeof row?.rowNumber === "number" ? row.rowNumber : 0,
        email,
        status: "skipped",
        reason: parsed.error.issues[0]?.message ?? "Row is invalid."
      });
      continue;
    }

    if (seenEmails.has(parsed.data.email)) {
      results.push({
        rowNumber: parsed.data.rowNumber,
        email: parsed.data.email,
        status: "skipped",
        reason: "Duplicate email in batch."
      });
      continue;
    }

    seenEmails.add(parsed.data.email);
    parsedRows.push(parsed.data);
  }

  if (isDemoMode()) {
    return {
      results: [
        ...results,
        ...parsedRows.map((row) => ({
          rowNumber: row.rowNumber,
          email: row.email,
          status: "skipped" as const,
          reason: "Demo mode does not persist imports."
        }))
      ].sort((a, b) => a.rowNumber - b.rowNumber)
    };
  }

  ensureSupabaseReady();
  const supabase = createAdminClient();
  const studentRoleId = await roleIdFor("student", supabase);
  const emails = parsedRows.map((row) => row.email);
  const existingEmails = new Set<string>();

  if (emails.length > 0) {
    const { data: existingProfiles, error } = await supabase.from("profiles").select("email").in("email", emails);
    if (error) throw new Error(error.message);
    for (const profile of existingProfiles ?? []) {
      existingEmails.add(profile.email.toLowerCase());
    }
  }

  for (const row of parsedRows) {
    if (existingEmails.has(row.email)) {
      results.push({ rowNumber: row.rowNumber, email: row.email, status: "skipped", reason: "Email already exists." });
      continue;
    }

    const creation = await createStudentAccount(
      {
        full_name: row.full_name,
        email: row.email,
        password: row.password,
        phone: row.phone,
        guardian_name: row.guardian_name,
        notes: ""
      },
      { actorId: user.id, studentRoleId, supabase }
    );

    if (creation.status === "created") {
      results.push({ rowNumber: row.rowNumber, email: row.email, status: "imported" });
      existingEmails.add(row.email);
    } else {
      results.push({ rowNumber: row.rowNumber, email: row.email, status: "skipped", reason: creation.reason });
    }
  }

  revalidatePath("/admin/users");
  return { results: results.sort((a, b) => a.rowNumber - b.rowNumber) };
}

export async function createAdminAction(formData: FormData) {
  const { user } = await requireSuperAdminAccess();
  const parsed = z
    .object({
      email: z.string().email(),
      full_name: z.string().min(1),
      password: z.string().min(8)
    })
    .parse(Object.fromEntries(formData));

  if (isDemoMode()) await demoRedirect("/admin/admins");
  ensureSupabaseReady();

  const supabase = createAdminClient();
  const { data: created, error } = await supabase.auth.admin.createUser({
    email: parsed.email,
    password: parsed.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.full_name }
  });
  if (error || !created.user) throw new Error(error?.message ?? "Could not create admin");

  const profileInsert = await supabase.from("profiles").insert({
    id: created.user.id,
    email: parsed.email,
    full_name: parsed.full_name,
    is_active: true
  });
  if (profileInsert.error) throw new Error(profileInsert.error.message);

  const roleInsert = await supabase.from("user_roles").insert({
    user_id: created.user.id,
    role_id: await roleIdFor("admin")
  });
  if (roleInsert.error) throw new Error(roleInsert.error.message);

  await logAudit({
    actorId: user.id,
    action: "user_created",
    resourceType: "profile",
    resourceId: created.user.id,
    afterData: { email: parsed.email, full_name: parsed.full_name, role: "admin" }
  });
  revalidatePath("/admin/admins");
  redirect("/admin/admins?success=Admin%20created");
}

export async function updateStudentAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const parsed = z
    .object({
      user_id: z.string().uuid(),
      email: z.string().email(),
      full_name: z.string().min(1),
      guardian_name: z.string().optional(),
      phone: z.string().optional(),
      notes: z.string().optional()
    })
    .parse({
      user_id: textValue(formData, "user_id"),
      email: textValue(formData, "email"),
      full_name: textValue(formData, "full_name"),
      guardian_name: textValue(formData, "guardian_name"),
      phone: textValue(formData, "phone"),
      notes: textValue(formData, "notes")
    });
  const isActive = booleanValue(formData, "is_active");

  if (isDemoMode()) await demoRedirect("/admin/users");
  ensureSupabaseReady();

  const supabase = createAdminClient();
  const [{ data: beforeProfile }, { data: beforeStudent }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", parsed.user_id).single(),
    supabase.from("student_profiles").select("*").eq("user_id", parsed.user_id).single()
  ]);
  const authUpdate = await supabase.auth.admin.updateUserById(parsed.user_id, {
    email: parsed.email,
    user_metadata: { full_name: parsed.full_name }
  });
  if (authUpdate.error) throw new Error(authUpdate.error.message);

  const profileUpdate = await supabase
    .from("profiles")
    .update({ email: parsed.email, full_name: parsed.full_name, is_active: isActive })
    .eq("id", parsed.user_id);
  if (profileUpdate.error) throw new Error(profileUpdate.error.message);

  const studentPayload = {
    user_id: parsed.user_id,
    guardian_name: parsed.guardian_name || null,
    phone: parsed.phone || null,
    notes: parsed.notes || null
  };
  const studentUpdate = await supabase.from("student_profiles").upsert(studentPayload, { onConflict: "user_id" });
  if (studentUpdate.error) throw new Error(studentUpdate.error.message);

  await logAudit({
    actorId: user.id,
    action: "user_updated",
    resourceType: "profile",
    resourceId: parsed.user_id,
    beforeData: { profile: beforeProfile, student_profile: beforeStudent },
    afterData: { profile: { email: parsed.email, full_name: parsed.full_name, is_active: isActive }, student_profile: studentPayload }
  });
  revalidatePath("/admin/users");
  redirect("/admin/users?success=Student%20updated");
}

export async function createGroupAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const parsed = z.object({ name: z.string().min(1), description: z.string().optional() }).parse(Object.fromEntries(formData));
  if (isDemoMode()) await demoRedirect("/admin/groups");
  ensureSupabaseReady();
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("content_groups").insert(parsed).select("id").single();
  if (error) throw new Error(error.message);
  await logAudit({ actorId: user.id, action: "group_created", resourceType: "content_group", resourceId: data.id, afterData: parsed });
  revalidatePath("/admin/groups");
  redirect("/admin/groups?success=Group%20created");
}

export async function updateGroupAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const parsed = z
    .object({
      group_id: z.string().uuid(),
      name: z.string().min(1),
      description: z.string().optional()
    })
    .parse({
      group_id: textValue(formData, "group_id"),
      name: textValue(formData, "name"),
      description: textValue(formData, "description")
    });
  const payload = {
    name: parsed.name,
    description: parsed.description || null,
    is_active: booleanValue(formData, "is_active")
  };

  if (isDemoMode()) await demoRedirect("/admin/groups");
  ensureSupabaseReady();

  const supabase = createAdminClient();
  const { data: beforeData } = await supabase.from("content_groups").select("*").eq("id", parsed.group_id).single();
  const { error } = await supabase.from("content_groups").update(payload).eq("id", parsed.group_id);
  if (error) throw new Error(error.message);
  await logAudit({
    actorId: user.id,
    action: "group_updated",
    resourceType: "content_group",
    resourceId: parsed.group_id,
    beforeData,
    afterData: payload
  });
  revalidatePath("/admin/groups");
  redirect("/admin/groups?success=Group%20updated");
}

export async function deactivateStudentAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const userId = textValue(formData, "user_id");
  if (isDemoMode()) await demoRedirect("/admin/users");
  ensureSupabaseReady();
  const supabase = createAdminClient();
  const { error } = await supabase.from("profiles").update({ is_active: false }).eq("id", userId);
  if (error) throw new Error(error.message);
  await logAudit({ actorId: user.id, action: "user_deactivated", resourceType: "profile", resourceId: userId });
  revalidatePath("/admin/users");
  redirect("/admin/users?success=Student%20deactivated");
}

export async function toggleGroupAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const groupId = textValue(formData, "group_id");
  const isActive = textValue(formData, "is_active") === "true";
  if (isDemoMode()) await demoRedirect("/admin/groups");
  ensureSupabaseReady();
  const supabase = createAdminClient();
  const { error } = await supabase.from("content_groups").update({ is_active: isActive }).eq("id", groupId);
  if (error) throw new Error(error.message);
  await logAudit({ actorId: user.id, action: "group_updated", resourceType: "content_group", resourceId: groupId, afterData: { is_active: isActive } });
  revalidatePath("/admin/groups");
  redirect("/admin/groups?success=Group%20updated");
}

export async function addStudentToGroupAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const parsed = z
    .object({
      student_id: z.string().uuid(),
      group_id: z.string().uuid(),
      starts_at: z.string().optional(),
      expires_at: z.string().optional()
    })
    .parse(Object.fromEntries(formData));
  if (isDemoMode()) await demoRedirect("/admin/groups");
  ensureSupabaseReady();
  const supabase = createAdminClient();
  await supabase.from("student_group_memberships").upsert(
    {
      student_id: parsed.student_id,
      group_id: parsed.group_id,
      status: "active",
      starts_at: parsed.starts_at || null,
      expires_at: parsed.expires_at || null
    },
    { onConflict: "student_id,group_id" }
  );
  await logAudit({
    actorId: user.id,
    action: "student_added_to_group",
    resourceType: "content_group",
    resourceId: parsed.group_id,
    afterData: parsed
  });
  revalidatePath("/admin/groups");
  redirect("/admin/groups?success=Student%20added%20to%20group");
}

export async function updateMembershipAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const parsed = z
    .object({
      membership_id: z.string().uuid(),
      status: membershipStatusSchema
    })
    .parse({
      membership_id: textValue(formData, "membership_id"),
      status: textValue(formData, "status")
    });
  const payload = {
    status: parsed.status,
    starts_at: datetimeValue(formData, "starts_at"),
    expires_at: datetimeValue(formData, "expires_at")
  };

  if (isDemoMode()) await demoRedirect("/admin/groups");
  ensureSupabaseReady();

  const supabase = createAdminClient();
  const { data: beforeData } = await supabase.from("student_group_memberships").select("*").eq("id", parsed.membership_id).single();
  const { error } = await supabase.from("student_group_memberships").update(payload).eq("id", parsed.membership_id);
  if (error) throw new Error(error.message);
  await logAudit({
    actorId: user.id,
    action: "group_updated",
    resourceType: "student_group_membership",
    resourceId: parsed.membership_id,
    beforeData,
    afterData: payload
  });
  revalidatePath("/admin/groups");
  redirect("/admin/groups?success=Membership%20updated");
}

export async function removeStudentFromGroupAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const parsed = z.object({ student_id: z.string().uuid(), group_id: z.string().uuid() }).parse(Object.fromEntries(formData));
  if (isDemoMode()) await demoRedirect("/admin/groups");
  ensureSupabaseReady();
  const supabase = createAdminClient();
  await supabase.from("student_group_memberships").delete().eq("student_id", parsed.student_id).eq("group_id", parsed.group_id);
  await logAudit({
    actorId: user.id,
    action: "student_removed_from_group",
    resourceType: "content_group",
    resourceId: parsed.group_id,
    beforeData: parsed
  });
  revalidatePath("/admin/groups");
  redirect("/admin/groups?success=Student%20removed%20from%20group");
}

export async function createAccessGrantAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const parsed = z
    .object({
      grantee_type: z.enum(["user", "group"]),
      grantee_id: z.string().uuid(),
      resource_type: resourceTypeSchema,
      resource_id: z.string().uuid(),
      starts_at: z.string().min(1),
      expires_at: z.string().min(1)
    })
    .parse(Object.fromEntries(formData));
  const permissions = z.array(z.enum(["view", "download"])).min(1).parse(formData.getAll("permission"));
  if (isDemoMode()) await demoRedirect("/admin/access");
  ensureSupabaseReady();
  const supabase = createAdminClient();
  const basePayload = {
    ...parsed,
    starts_at: datetimeValue(formData, "starts_at"),
    expires_at: datetimeValue(formData, "expires_at"),
    granted_by: user.id
  };
  const payload = permissions.map((permission) => ({ ...basePayload, permission }));
  const { data, error } = await supabase.from("access_grants").insert(payload).select("id");
  if (error) throw new Error(error.message);
  await logAudit({
    actorId: user.id,
    action: "access_granted",
    resourceType: parsed.resource_type,
    resourceId: data?.[0]?.id ?? null,
    afterData: { ...basePayload, permissions }
  });
  revalidatePath("/admin/access");
  redirect("/admin/access?success=Access%20granted");
}

export async function revokeAccessGrantAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const grantId = textValue(formData, "grant_id");
  if (isDemoMode()) await demoRedirect("/admin/access");
  ensureSupabaseReady();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("access_grants")
    .update({ revoked_at: new Date().toISOString(), revoked_by: user.id })
    .eq("id", grantId);
  if (error) throw new Error(error.message);
  await logAudit({ actorId: user.id, action: "access_revoked", resourceType: "access_grant", resourceId: grantId });
  revalidatePath("/admin/access");
  redirect("/admin/access?success=Access%20revoked");
}

export async function createYearAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const payload = {
    name: textValue(formData, "name"),
    description: nullableTextValue(formData, "description"),
    sort_order: Number(textValue(formData, "sort_order") || 0),
    status: statusSchema.parse(textValue(formData, "status")),
    is_ai_indexable: booleanValue(formData, "is_ai_indexable")
  };
  if (isDemoMode()) await demoRedirect("/admin/content");
  ensureSupabaseReady();
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("years").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  await logAudit({ actorId: user.id, action: "content_created", resourceType: "year", resourceId: data.id, afterData: payload });
  revalidatePath("/admin/content");
  redirect("/admin/content?success=Year%20created");
}

export async function createSubjectAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const payload = {
    year_id: textValue(formData, "year_id"),
    name: textValue(formData, "name"),
    description: nullableTextValue(formData, "description"),
    sort_order: Number(textValue(formData, "sort_order") || 0),
    status: statusSchema.parse(textValue(formData, "status")),
    is_ai_indexable: booleanValue(formData, "is_ai_indexable")
  };
  if (isDemoMode()) await demoRedirect("/admin/content");
  ensureSupabaseReady();
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("subjects").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  await logAudit({ actorId: user.id, action: "content_created", resourceType: "subject", resourceId: data.id, afterData: payload });
  revalidatePath("/admin/content");
  redirect("/admin/content?success=Subject%20created");
}

export async function createChapterAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const payload = {
    subject_id: textValue(formData, "subject_id"),
    title: textValue(formData, "title"),
    description: nullableTextValue(formData, "description"),
    sort_order: Number(textValue(formData, "sort_order") || 0),
    status: statusSchema.parse(textValue(formData, "status")),
    is_ai_indexable: booleanValue(formData, "is_ai_indexable")
  };
  if (isDemoMode()) await demoRedirect("/admin/content");
  ensureSupabaseReady();
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("chapters").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  await logAudit({ actorId: user.id, action: "content_created", resourceType: "chapter", resourceId: data.id, afterData: payload });
  revalidatePath("/admin/content");
  redirect("/admin/content?success=Chapter%20created");
}

export async function createQuestionAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const payload = {
    chapter_id: textValue(formData, "chapter_id"),
    title: textValue(formData, "title"),
    question_text: textValue(formData, "question_text"),
    description: nullableTextValue(formData, "description"),
    sort_order: Number(textValue(formData, "sort_order") || 0),
    status: statusSchema.parse(textValue(formData, "status")),
    is_ai_indexable: booleanValue(formData, "is_ai_indexable")
  };
  if (isDemoMode()) await demoRedirect("/admin/content");
  ensureSupabaseReady();
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("questions").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  await logAudit({ actorId: user.id, action: "content_created", resourceType: "question", resourceId: data.id, afterData: payload });
  revalidatePath("/admin/content");
  redirect("/admin/content?success=Question%20created");
}

export async function setContentStatusAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const resourceType = z.enum(["year", "subject", "chapter", "question"]).parse(textValue(formData, "resource_type"));
  const resourceId = textValue(formData, "resource_id");
  const status = statusSchema.parse(textValue(formData, "status"));
  if (isDemoMode()) await demoRedirect("/admin/content");
  ensureSupabaseReady();
  const table = resourceType === "year" ? "years" : resourceType === "subject" ? "subjects" : resourceType === "chapter" ? "chapters" : "questions";
  const supabase = createAdminClient();
  const { error } = await supabase.from(table).update({ status }).eq("id", resourceId);
  if (error) throw new Error(error.message);
  await logAudit({
    actorId: user.id,
    action: status === "published" ? "content_published" : status === "draft" ? "content_unpublished" : "content_updated",
    resourceType,
    resourceId,
    afterData: { status }
  });
  revalidatePath("/admin/content");
  redirect("/admin/content?success=Content%20status%20updated");
}

export async function archiveContentAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const resourceType = z.enum(["year", "subject", "chapter", "question"]).parse(textValue(formData, "resource_type"));
  const resourceId = z.string().uuid().parse(textValue(formData, "resource_id"));
  const table =
    resourceType === "year" ? "years" : resourceType === "subject" ? "subjects" : resourceType === "chapter" ? "chapters" : "questions";

  if (isDemoMode()) await demoRedirect("/admin/content");
  ensureSupabaseReady();

  const supabase = createAdminClient();
  const { data: beforeData } = await supabase.from(table).select("*").eq("id", resourceId).single();
  const payload = { status: "archived" };
  const { error } = await supabase.from(table).update(payload).eq("id", resourceId);
  if (error) throw new Error(error.message);
  await logAudit({
    actorId: user.id,
    action: "content_updated",
    resourceType,
    resourceId,
    beforeData,
    afterData: payload
  });
  revalidatePath("/admin/content");
  redirect("/admin/content?success=Content%20archived");
}

export async function updateContentAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const resourceType = z.enum(["year", "subject", "chapter", "question"]).parse(textValue(formData, "resource_type"));
  const resourceId = z.string().uuid().parse(textValue(formData, "resource_id"));
  const base = {
    description: nullableTextValue(formData, "description"),
    sort_order: numberValue(formData, "sort_order"),
    status: statusSchema.parse(textValue(formData, "status")),
    is_ai_indexable: booleanValue(formData, "is_ai_indexable")
  };
  const table =
    resourceType === "year" ? "years" : resourceType === "subject" ? "subjects" : resourceType === "chapter" ? "chapters" : "questions";
  const payload =
    resourceType === "year"
      ? { ...base, name: z.string().min(1).parse(textValue(formData, "name")) }
      : resourceType === "subject"
        ? {
            ...base,
            year_id: z.string().uuid().parse(textValue(formData, "year_id")),
            name: z.string().min(1).parse(textValue(formData, "name"))
          }
        : resourceType === "chapter"
          ? {
              ...base,
              subject_id: z.string().uuid().parse(textValue(formData, "subject_id")),
              title: z.string().min(1).parse(textValue(formData, "title"))
            }
          : {
              ...base,
              chapter_id: z.string().uuid().parse(textValue(formData, "chapter_id")),
              title: z.string().min(1).parse(textValue(formData, "title")),
              question_text: textValue(formData, "question_text")
            };

  if (isDemoMode()) await demoRedirect("/admin/content");
  ensureSupabaseReady();

  const supabase = createAdminClient();
  const { data: beforeData } = await supabase.from(table).select("*").eq("id", resourceId).single();
  const { error } = await supabase.from(table).update(payload).eq("id", resourceId);
  if (error) throw new Error(error.message);
  await logAudit({
    actorId: user.id,
    action: payload.status === "published" ? "content_published" : payload.status === "draft" ? "content_unpublished" : "content_updated",
    resourceType,
    resourceId,
    beforeData,
    afterData: payload
  });
  revalidatePath("/admin/content");
  redirect("/admin/content?success=Content%20updated");
}

export async function createRecordingAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const payload = {
    chapter_id: textValue(formData, "chapter_id"),
    question_id: nullableTextValue(formData, "question_id"),
    title: textValue(formData, "title"),
    description: nullableTextValue(formData, "description"),
    youtube_video_id: textValue(formData, "youtube_video_id"),
    duration_seconds: nullableNumberValue(formData, "duration_seconds"),
    transcript_text: nullableTextValue(formData, "transcript_text"),
    transcript_source: transcriptSourceSchema.parse(textValue(formData, "transcript_source") || "none"),
    transcript_review_status: transcriptReviewStatusSchema.parse(textValue(formData, "transcript_review_status") || "draft"),
    status: statusSchema.parse(textValue(formData, "status")),
    is_ai_indexable: booleanValue(formData, "is_ai_indexable"),
    created_by: user.id
  };
  if (isDemoMode()) await demoRedirect("/admin/recordings");
  ensureSupabaseReady();
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("recordings").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  await logAudit({ actorId: user.id, action: "recording_created", resourceType: "recording", resourceId: data.id, afterData: payload });
  revalidatePath("/admin/recordings");
  redirect("/admin/recordings?success=Recording%20created");
}

export async function updateRecordingAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const recordingId = z.string().uuid().parse(textValue(formData, "recording_id"));
  const payload = {
    chapter_id: z.string().uuid().parse(textValue(formData, "chapter_id")),
    question_id: nullableTextValue(formData, "question_id"),
    title: z.string().min(1).parse(textValue(formData, "title")),
    description: nullableTextValue(formData, "description"),
    youtube_video_id: z.string().min(1).parse(textValue(formData, "youtube_video_id")),
    duration_seconds: nullableNumberValue(formData, "duration_seconds"),
    transcript_text: nullableTextValue(formData, "transcript_text"),
    transcript_source: transcriptSourceSchema.parse(textValue(formData, "transcript_source") || "none"),
    transcript_review_status: transcriptReviewStatusSchema.parse(textValue(formData, "transcript_review_status") || "draft"),
    status: statusSchema.parse(textValue(formData, "status")),
    is_ai_indexable: booleanValue(formData, "is_ai_indexable")
  };

  if (isDemoMode()) await demoRedirect("/admin/recordings");
  ensureSupabaseReady();

  const supabase = createAdminClient();
  const { data: beforeData } = await supabase.from("recordings").select("*").eq("id", recordingId).single();
  const { error } = await supabase.from("recordings").update(payload).eq("id", recordingId);
  if (error) throw new Error(error.message);
  await logAudit({
    actorId: user.id,
    action: "recording_updated",
    resourceType: "recording",
    resourceId: recordingId,
    beforeData,
    afterData: payload
  });
  revalidatePath("/admin/recordings");
  redirect("/admin/recordings?success=Recording%20updated");
}

export async function setRecordingStatusAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const recordingId = textValue(formData, "recording_id");
  const status = statusSchema.parse(textValue(formData, "status"));
  if (isDemoMode()) await demoRedirect("/admin/recordings");
  ensureSupabaseReady();
  const supabase = createAdminClient();
  const { error } = await supabase.from("recordings").update({ status }).eq("id", recordingId);
  if (error) throw new Error(error.message);
  await logAudit({ actorId: user.id, action: "recording_updated", resourceType: "recording", resourceId: recordingId, afterData: { status } });
  revalidatePath("/admin/recordings");
  redirect("/admin/recordings?success=Recording%20status%20updated");
}

export async function uploadMaterialAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/admin/materials?error=Select%20a%20file");
  }

  const validationError = validateMaterialFile({ mimeType: file.type, sizeBytes: file.size });
  if (validationError) {
    redirect(`/admin/materials?error=${encodeURIComponent(validationError)}`);
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const fileKey = `materials/${crypto.randomUUID()}-${safeName}`;
  const payload = {
    chapter_id: textValue(formData, "chapter_id"),
    question_id: nullableTextValue(formData, "question_id"),
    title: textValue(formData, "title"),
    description: nullableTextValue(formData, "description"),
    storage_bucket: "solution-materials",
    file_key: fileKey,
    file_name: file.name,
    mime_type: file.type,
    file_size_bytes: file.size,
    is_downloadable: booleanValue(formData, "is_downloadable"),
    status: statusSchema.parse(textValue(formData, "status")),
    is_ai_indexable: booleanValue(formData, "is_ai_indexable"),
    uploaded_by: user.id
  };

  if (isDemoMode()) await demoRedirect("/admin/materials");
  ensureSupabaseReady();
  const supabase = createAdminClient();
  const { error: uploadError } = await supabase.storage.from("solution-materials").upload(fileKey, file, {
    contentType: file.type,
    upsert: false
  });
  if (uploadError) throw new Error(uploadError.message);
  const { data, error } = await supabase.from("solution_materials").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  await logAudit({ actorId: user.id, action: "material_uploaded", resourceType: "solution_material", resourceId: data.id, afterData: payload });
  revalidatePath("/admin/materials");
  redirect("/admin/materials?success=Material%20uploaded");
}

export async function setMaterialStatusAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const materialId = textValue(formData, "material_id");
  const status = statusSchema.parse(textValue(formData, "status"));
  if (isDemoMode()) await demoRedirect("/admin/materials");
  ensureSupabaseReady();
  const supabase = createAdminClient();
  const { error } = await supabase.from("solution_materials").update({ status }).eq("id", materialId);
  if (error) throw new Error(error.message);
  await logAudit({
    actorId: user.id,
    action: status === "archived" ? "material_archived" : "content_updated",
    resourceType: "solution_material",
    resourceId: materialId,
    afterData: { status }
  });
  revalidatePath("/admin/materials");
  redirect("/admin/materials?success=Material%20status%20updated");
}

export async function updateMaterialAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const materialId = z.string().uuid().parse(textValue(formData, "material_id"));
  const payload = {
    chapter_id: z.string().uuid().parse(textValue(formData, "chapter_id")),
    question_id: nullableTextValue(formData, "question_id"),
    title: z.string().min(1).parse(textValue(formData, "title")),
    description: nullableTextValue(formData, "description"),
    is_downloadable: booleanValue(formData, "is_downloadable"),
    status: statusSchema.parse(textValue(formData, "status")),
    is_ai_indexable: booleanValue(formData, "is_ai_indexable")
  };

  if (isDemoMode()) await demoRedirect("/admin/materials");
  ensureSupabaseReady();

  const supabase = createAdminClient();
  const { data: beforeData } = await supabase.from("solution_materials").select("*").eq("id", materialId).single();
  const { error } = await supabase.from("solution_materials").update(payload).eq("id", materialId);
  if (error) throw new Error(error.message);
  await logAudit({
    actorId: user.id,
    action: payload.status === "archived" ? "material_archived" : "content_updated",
    resourceType: "solution_material",
    resourceId: materialId,
    beforeData,
    afterData: payload
  });
  revalidatePath("/admin/materials");
  redirect("/admin/materials?success=Material%20updated");
}

export async function archiveExamAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const examId = z.string().uuid().parse(textValue(formData, "exam_id"));

  if (isDemoMode()) await demoRedirect("/admin/exams");
  ensureSupabaseReady();

  const supabase = createAdminClient();
  const { data: beforeData, error: fetchError } = await supabase.from("exams").select("*").eq("id", examId).single();
  if (fetchError || !beforeData) {
    redirect("/admin/exams?error=Exam%20not%20found");
  }

  if (beforeData.status === "archived") {
    redirect("/admin/exams?success=Exam%20already%20archived");
  }

  if (beforeData.processing_status === "processing") {
    redirect("/admin/exams?error=Wait%20for%20exam%20processing%20to%20finish%20before%20archiving");
  }

  const payload = { status: "archived" };
  const { error } = await supabase.from("exams").update(payload).eq("id", examId);
  if (error) throw new Error(error.message);

  await logAudit({
    actorId: user.id,
    action: "exam_archived",
    resourceType: "exam",
    resourceId: examId,
    beforeData,
    afterData: payload
  });

  revalidatePath("/admin/exams");
  revalidatePath(`/admin/exams/${examId}`);
  redirect("/admin/exams?success=Exam%20archived");
}

async function restoredExamStatus(
  supabase: ReturnType<typeof createAdminClient>,
  examId: string,
  exam: { published_at?: string | null }
) {
  const { data: archiveLog } = await supabase
    .from("audit_logs")
    .select("before_data")
    .eq("resource_type", "exam")
    .eq("resource_id", examId)
    .eq("action", "exam_archived")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousStatus = examRestoreStatusSchema.safeParse(
    (archiveLog?.before_data as { status?: unknown } | null | undefined)?.status
  );

  if (previousStatus.success) return previousStatus.data;
  return exam.published_at ? "published" : "review";
}

export async function unarchiveExamAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const examId = z.string().uuid().parse(textValue(formData, "exam_id"));

  if (isDemoMode()) await demoRedirect("/admin/exams");
  ensureSupabaseReady();

  const supabase = createAdminClient();
  const { data: beforeData, error: fetchError } = await supabase.from("exams").select("*").eq("id", examId).single();
  if (fetchError || !beforeData) {
    redirect("/admin/exams?error=Exam%20not%20found");
  }

  if (beforeData.status !== "archived") {
    redirect("/admin/exams?success=Exam%20is%20already%20active");
  }

  const status = await restoredExamStatus(supabase, examId, beforeData);
  const payload = { status };
  const { error } = await supabase.from("exams").update(payload).eq("id", examId);
  if (error) throw new Error(error.message);

  await logAudit({
    actorId: user.id,
    action: "exam_unarchived",
    resourceType: "exam",
    resourceId: examId,
    beforeData,
    afterData: payload
  });

  revalidatePath("/admin/exams");
  revalidatePath(`/admin/exams/${examId}`);
  redirect("/admin/exams?success=Exam%20unarchived");
}

export async function createTagAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const name = textValue(formData, "name");
  const payload = { name, slug: slugify(name) };
  if (isDemoMode()) await demoRedirect("/admin/tags");
  ensureSupabaseReady();
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("tags").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  await logAudit({ actorId: user.id, action: "content_created", resourceType: "tag", resourceId: data.id, afterData: payload });
  revalidatePath("/admin/tags");
  redirect("/admin/tags?success=Tag%20created");
}

export async function updateTagAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const tagId = z.string().uuid().parse(textValue(formData, "tag_id"));
  const name = z.string().min(1).parse(textValue(formData, "name"));
  const slug = slugify(textValue(formData, "slug") || name);
  const payload = { name, slug };

  if (isDemoMode()) await demoRedirect("/admin/tags");
  ensureSupabaseReady();

  const supabase = createAdminClient();
  const { data: beforeData } = await supabase.from("tags").select("*").eq("id", tagId).single();
  const { error } = await supabase.from("tags").update(payload).eq("id", tagId);
  if (error) throw new Error(error.message);
  await logAudit({
    actorId: user.id,
    action: "content_updated",
    resourceType: "tag",
    resourceId: tagId,
    beforeData,
    afterData: payload
  });
  revalidatePath("/admin/tags");
  redirect("/admin/tags?success=Tag%20updated");
}
