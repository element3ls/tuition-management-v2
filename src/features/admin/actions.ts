"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/auth/session";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { logAudit } from "@/lib/audit/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateMaterialFile } from "@/lib/storage/materials";

const statusSchema = z.enum(["draft", "published", "archived"]);
const resourceTypeSchema = z.enum(["year", "subject", "chapter", "question", "recording", "solution_material"]);
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

async function roleIdFor(name: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("roles").select("id").eq("name", name).single();
  if (error || !data) throw new Error(`Role not found: ${name}`);
  return data.id as string;
}

export async function createStudentAction(formData: FormData) {
  const { user } = await requireAdminAccess();
  const parsed = z
    .object({
      email: z.string().email(),
      full_name: z.string().min(1),
      password: z.string().min(8),
      guardian_name: z.string().optional(),
      phone: z.string().optional(),
      notes: z.string().optional()
    })
    .parse(Object.fromEntries(formData));

  if (isDemoMode()) await demoRedirect("/admin/users");
  ensureSupabaseReady();

  const supabase = createAdminClient();
  const { data: created, error } = await supabase.auth.admin.createUser({
    email: parsed.email,
    password: parsed.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.full_name }
  });
  if (error || !created.user) throw new Error(error?.message ?? "Could not create user");

  await supabase.from("profiles").insert({
    id: created.user.id,
    email: parsed.email,
    full_name: parsed.full_name,
    is_active: true
  });
  await supabase.from("student_profiles").insert({
    user_id: created.user.id,
    guardian_name: parsed.guardian_name || null,
    phone: parsed.phone || null,
    notes: parsed.notes || null
  });
  await supabase.from("user_roles").insert({
    user_id: created.user.id,
    role_id: await roleIdFor("student")
  });
  await logAudit({ actorId: user.id, action: "user_created", resourceType: "profile", resourceId: created.user.id, afterData: parsed });
  revalidatePath("/admin/users");
  redirect("/admin/users?success=Student%20created");
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
      permission: z.enum(["view", "download"]),
      starts_at: z.string().optional(),
      expires_at: z.string().optional()
    })
    .parse(Object.fromEntries(formData));
  if (isDemoMode()) await demoRedirect("/admin/access");
  ensureSupabaseReady();
  const supabase = createAdminClient();
  const payload = {
    ...parsed,
    starts_at: parsed.starts_at || null,
    expires_at: parsed.expires_at || null,
    granted_by: user.id
  };
  const { data, error } = await supabase.from("access_grants").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  await logAudit({ actorId: user.id, action: "access_granted", resourceType: parsed.resource_type, resourceId: data.id, afterData: payload });
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
